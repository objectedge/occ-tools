'use strict';

var fs = require('fs-extra');
var os = require('os');
var path = require('path');
var util = require('util');
var async = require('async');
var winston = require('winston');
var extract = require('extract-zip');
var _config = require('../config');
var ncp = require('ncp');

/**
 * Get the widget config from file
 *
 * @param {Function} callback
 */
function getWidgetConfig(callback) {
  fs.readFile(
    path.join(this._widgetFolder, 'widget.json'),
    'utf8',
    function (error, data) {
      if (error){
        callback(error);
      }

      return callback(null, JSON.parse(data));
    }
  );
}

/**
 * Find the widget information on OCC
 *
 * @param {Function} callback
 */
function getWidgetInstance(callback){
  var self = this;
  winston.info('Retrieving widget instances from OCC');
  var reqOptions = {
    api: '/widgetDescriptors/instances',
    method: 'get',
    qs: {
      source: '100'
    }
  };

  var widgetId = self._options.fromOcc;
  self._occ.request(reqOptions, function (error, response) {
    if (error){
      callback(error);
    }
    var widget = response.items.find(function(widget){
      return widgetId == widget.widgetType ||
      widgetId == widget.id ||
      widget.instances.find(function(instance){
        return widgetId == instance.id;
      });
    });

    if (!widget || !widget.instances || !widget.instances.length){
      callback('Widget not found on OCC');
    }

    winston.info('Found widget %s on OCC', widget.widgetType);
    winston.debug('Widget found: ', widget);
    self._widget = widget;
    callback(null);
  });
}

/**
 * Download the widget zip file from OCC
 *
 * @param {Function} callback
 */
function downloadWidgetZip(callback){
  winston.info('Downloading widget zip file from OCC');
  var downloadOptions = {
    api: util.format('/assetPackages/%s', this._widget.instances[0].id),
    method: 'get',
    body: true,
    download: this._tempFile,
    qs: {
      type: 'widget',
      fileName: 'fileName'
    }
  };
  this._occ.request(downloadOptions, function(error, body) {
    if (error || (body && body.status == 404)) {
      callback(error || 'Error downloading widget zip from OCC');
    }
    callback(null);
  });
}

/**
 * Move widget files from temporary to final folder
 *
 * @param {Function} callback
 */
function moveFiles(callback){
  var self = this;
  var downloadedPath = path.join(self._tempFolder, 'widget', self._widget.id);
  fs.lstat(downloadedPath, function(error){
    if (error) {
      fs.readdir(path.join(self._tempFolder, 'widget'), function (error, dirs){
        if (error || !dirs || !dirs.length){
          callback('Error downloading the widget from OCC');
        }
        ncp(path.join(self._tempFolder, 'widget', dirs[0]), self._widgetFolder, callback);
      });
    } else {
      ncp(path.join(self._tempFolder, 'widget', self._widget.id), self._widgetFolder, callback);
    }
  });
}

/**
 * Replace the configurations an store it
 *
 * @param {Function} callback
 */
function replaceConfigs(config, callback){
  if (config.version < this._widget.version) {
    winston.warn('You are downloading version %d of this widget and the latest version is %d', config.version, this._widget.version);
    winston.warn('If you want the latest version of this widget, remove it from all pages and create a fresh instance');
  }

  this._i18nresources = config.i18nresources;
  this._javascript = config.javascript;

  config.i18nresources = this._widgetName;
  config.javascript = this._widgetName;
  config.widgetFamily = this._widgetName;
  config.widgetType = this._widgetName;
  delete config.source;
  config.name = this._widgetDesc;

  fs.outputFile(
    path.join(this._widgetFolder, 'widget.json'),
    JSON.stringify(config, null, 2),
    {},
    callback
  );
}

/**
 * Remove the minified files
 *
 * @param {Function} callback
 */
function removeJsMinFiles(callback){
  fs.unlink(path.join(this._widgetFolder, 'js', util.format('%s.min.js', this._javascript)), callback);
}

/**
 * Rename the main javascript file with the new name
 *
 * @param {Function} callback
 */
function renameJsFile(callback){
  fs.rename(
    path.join(this._widgetFolder, 'js', util.format('%s.js', this._javascript)),
    path.join(this._widgetFolder, 'js', util.format('%s.js', this._widgetName)),
    callback
  );
}

/**
 * Rename the locale files with the new name
 *
 * @param {Function} callback
 */
function renameLocaleFiles(callback){
  var self = this;
  async.waterfall(
    [
      function(callback){
        fs.readdir(path.join(self._widgetFolder, 'locales'), callback);
      },
      function(dirs, callback){
        async.each(dirs,
          function(dir, callback){
            fs.rename(
              path.join(self._widgetFolder, 'locales', dir, util.format('ns.%s.json', self._i18nresources)),
              path.join(self._widgetFolder, 'locales', dir, util.format('ns.%s.json', self._widgetName)),
              callback
            );
          },
          callback
        );
      }
    ],
    callback
  );
}

/**
 * Add the templates as inner templates and replace the templates references
 *
 * @param {Function} templatesFolder
 * @param {Function} template
 * @param {Function} defaultTemplatePath
 * @param {Function} callback
 */
function replaceTemplates(templatesFolder, template, defaultTemplatePath, callback) {
  async.waterfall([
    fs.readFile.bind(null, path.join(templatesFolder, template), 'utf8'),
    function (data, callback) {
      fs.appendFile(
        defaultTemplatePath,
        util.format('<script type="text/html" id="%s">\n%s\n</script>', template.replace('.template', ''), data),
        callback
      );
    },
    fs.readFile.bind(null, defaultTemplatePath, 'utf8'),
    function (data, callback) {
      data = data.replace(
        new RegExp('template\\s*:\\s*{.*\\/templates\\/' + template.replace('.', '\\.') + '.*}', 'g'),
        util.format('template: { name: \'%s\' }', template.replace('.template', ''))
      );
      fs.outputFile(defaultTemplatePath, data, {}, callback);
    },
    fs.unlink.bind(null, path.join(templatesFolder, template))
  ], callback);
}

/**
 * Aggreagate all templates into display.template
 *
 * @param {Function} callback
 */
function aggregateTemplates(callback){
  var defaultTemplate = 'display.template';
  var templatesFolder = path.join(this._widgetFolder, 'templates');
  var defaultTemplatePath = path.join(templatesFolder, defaultTemplate);
  async.waterfall([
    function(callback){
      fs.readdir(templatesFolder, callback);
    },
    function(templates, callback){
      async.eachLimit(
        templates, 1,
        function(template, callback){
          if (template == defaultTemplate){
            callback();
          } else {
            replaceTemplates(templatesFolder, template, defaultTemplatePath, callback);
          }
        },
        callback
      );
    }],
    callback
  );
}

/**
 * Clean up temporary files
 *
 * @param {Function} callback
 */
function cleanUp(callback){
  async.waterfall(
    [
      fs.unlink.bind(null, this._tempFile),
      fs.remove.bind(null, this._tempFolder)
    ],
    callback
  );
}

/**
 * Move widget files from temporary to final folder
 *
 * @param {Function} callback
 */
function replaceElements(callback){
  var self = this;
  fs.lstat(path.join(self._widgetFolder, 'element'), function(error) {
    if (error) {
      callback();
    } else {
      var templates = [];
      templates.push(path.join(self._widgetFolder, 'templates', 'display.template'));
      async.waterfall(
        [
          function (callback) {
            fs.readdir(path.join(self._widgetFolder, 'layouts'), function(error, dirs){
              if (error) {
                callback(error);
              }

              dirs.forEach(function(dir){
                templates.push(
                  path.join(self._widgetFolder, 'layouts', dir, 'widget.template')
                );
              });

              callback();
            });
          },
          function(callback){
            fs.readdir(path.join(self._widgetFolder, 'element'), callback);
          },
          function(dirs, callback){
            async.eachLimit(dirs, 1,
              function(dir, callback){
                var oldName = dir;
                var newName = util.format('%s-%s', self._widgetName, dir);
                var newFolder = path.join(self._widgetFolder, 'element', newName);

                async.waterfall([
                  function(callback){
                    fs.rename(
                      path.join(self._widgetFolder, 'element', oldName),
                      newFolder,
                      callback
                    );
                  },
                  function(callback){
                    async.each(templates,
                      function(template){
                        fs.readFile(template, 'utf8', function(error, data) {
                          data = data.replace(
                            new RegExp('element\\s*:\\s*\''+ oldName + '\'', 'g'),
                            util.format('element:  \'%s\'', newName)
                          );
                          fs.outputFile(template, data, {}, callback);
                        });
                      },
                      callback);
                  },
                  function(callback) {
                    var configFile = path.join(newFolder, 'element.json');
                    fs.readFile(configFile, 'utf8',
                      function (error, data) {
                        if (error){
                          callback(error);
                        }

                        data = JSON.parse(data);
                        data.tag = newName;
                        if (data.supportedWidgetType && data.supportedWidgetType.includes(self._widget.widgetType)) {
                          var index = data.supportedWidgetType.indexOf(self._widget.widgetType);

                          if (index !== -1) {
                            data.supportedWidgetType[index] = self._widgetName;
                          }
                        }

                        fs.outputFile(configFile, JSON.stringify(data, null, 2), {}, callback);
                      }
                    );
                  },
                  function(callback) {
                    var jsFile = path.join(newFolder, 'js', 'element.js');
                    fs.lstat(jsFile, function(error) {
                      if (error) {
                        callback();
                      } else {
                        fs.readFile(jsFile, 'utf8', function(error, data) {
                          data = data.replace(
                            new RegExp('elementName\\s*:\\s*\''+ oldName + '\'', 'g'),
                            util.format('elementName:  \'%s\'', newName)
                          );
                          fs.outputFile(jsFile, data, {}, callback);
                        });
                      }
                    });
                  },
                  function(callback) {
                    var jsFile = path.join(newFolder, 'templates', 'template.txt');
                    fs.lstat(jsFile, function(error) {
                      if (error) {
                        callback();
                      } else {
                        fs.readFile(jsFile, 'utf8', function(error, data) {
                          data = data.replace(
                            new RegExp('\''+ oldName + '\'', 'g'),
                            util.format('\'%s\'', newName)
                          );
                          fs.outputFile(jsFile, data, {}, callback);
                        });
                      }
                    });
                  }
                ], callback);

              },
              callback
            );
          }
        ],
        callback
      );
    }
  });
}

/**
 * Clean up temporary files
 *
 * @param {Function} callback
 */
function removeOldFiles(callback){
  fs.remove(this._widgetFolder, function(){
    callback();
  });
}

/**
 * Generate a new widget from one OCC OOTB
 *
 * @param {Function} occ
 * @param {Function} widgetName
 * @param {Function} options
 * @param {Function} callback
 */
module.exports = function(occ, widgetName, options, callback) {
  var self = {};
  self._occ = occ;
  self._widget;
  self._widgetName = widgetName;
  self._widgetDesc = options.description || widgetName;
  self._widgetFolder = path.join(_config.dir.project_root, 'widgets', 'objectedge', widgetName);
  self._tempFile = path.join(os.tmpdir(), util.format('widget-%s-%s.zip', widgetName, new Date().getTime()));
  self._tempFolder = path.join(os.tmpdir(), util.format('widget-%s-%s', widgetName, new Date().getTime()));
  self._options = options;
  self._i18nresources;
  self._javascript;

  winston.debug('Temporary file: ', self._tempFile);
  winston.debug('Temporary folder: ', self._tempFolder);

  async.waterfall([
    removeOldFiles.bind(self),
    getWidgetInstance.bind(self),
    downloadWidgetZip.bind(self),
    extract.bind(self, self._tempFile, { dir: self._tempFolder }),
    moveFiles.bind(self),
    getWidgetConfig.bind(self),
    replaceConfigs.bind(self),
    removeJsMinFiles.bind(self),
    renameJsFile.bind(self),
    renameLocaleFiles.bind(self),
    aggregateTemplates.bind(self),
    replaceElements.bind(self),
    cleanUp.bind(self)
  ], callback);
};
