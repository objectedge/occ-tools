'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs-extra');
var async = require('async');
var request = require('request');
var winston = require('winston');
var _configs = require('../config');
var widgetsInfo = require('./info');
var { fetchGlobalElements, downloadWidgetElements } = require('./downloadWidgetElement');

function getWidgetPath(settings, widgetInfo) {
  var folder = settings && settings.dest ? settings.dest : widgetInfo.folder;
  return path.join(_configs.dir.project_root, 'widgets', folder, widgetInfo.item.widgetType);
}

/**
 * Download the widget template file.
 * @param  {Object}   widgetInfo The widget info received from OCC.
 * @param  {Function} callback   The fn to be executed after download.
 */
function downloadTemplate(widgetInfo, settings, callback) {
  var self = this;

  winston.info('Downloading template for %s...', widgetInfo.item.widgetType);
  var describeCodePath = util.format('widgets/%s/code', widgetInfo.item.instances[0].id);
  self._occ.request(describeCodePath, function(err, file) {
    if (err) return callback(err);

    var templateDir = path.join(getWidgetPath(settings, widgetInfo), 'templates');
    winston.debug('Writing %s template in %s', widgetInfo.item.widgetType, templateDir);
    var templateFilePath = path.join(templateDir, 'display.template');
    fs.outputFile(templateFilePath, file.source, callback);
  });
}

/**
 * Download the widget LESS file.
 * @param  {Object}   widgetInfo The widget info received from OCC.
 * @param  {Function} callback   The fn to be executed after download.
 */
function downloadLess(widgetInfo, settings, callback) {
  var self = this;
  winston.info('Downloading LESS for %s...', widgetInfo.item.widgetType);
  var describeLessPath = util.format('widgets/%s/less', widgetInfo.item.instances[0].id);
  self._occ.request(describeLessPath, function(err, file) {
    if (err) return callback(err);
    var lessDir = path.join(getWidgetPath(settings, widgetInfo), 'less');
    winston.debug('Writing %s LESS in %s', widgetInfo.item.widgetType, lessDir);
    var lessFilePath = path.join(lessDir, 'widget.less');
    fs.outputFile(lessFilePath, file.source, callback);
  });
}

/**
 * Download all widget js files.
 * @param  {Object}   widgetInfo The widget info received from OCC.
 * @param  {Function} callback   The fn to be executed after download.
 */
function downloadAllJs(widgetInfo, settings, callback) {
  var self = this;
  winston.info('Downloading %s js files...', widgetInfo.item.widgetType);
  var describeJsPath = util.format('widgetDescriptors/%s/javascript', widgetInfo.item.id);
  var jsPath = path.join(getWidgetPath(settings, widgetInfo), 'js');
  self._occ.request(describeJsPath, function(err, data) {
    if (err) return callback(err);
    async.each(
      data.jsFiles,
      function (jsFile, callback) {
        fs.ensureDir(jsPath, function () {
          self._occ.request(
            {
              url: jsFile.url,
              method: 'get',
              download: path.join(jsPath, jsFile.name),
            },
            callback
          );
        });
      },
      callback
    );
  });
}

/**
 * Writes the widget descriptor in widget folder.
 * @param  {Object}   widgetInfo The widget info received from OCC.
 * @param  {Function} callback   The fn to executed after process.
 */
function writeDescriptor(widgetInfo, settings, callback) {
  var self = this;
  winston.info('Writing %s widget.json...', widgetInfo.item.widgetType);

  var widgetPath = getWidgetPath(settings, widgetInfo);

  if (widgetInfo.folder != 'oracle') {
    var options = {
      api: util.format('widgetDescriptors/%s/metadata', widgetInfo.item.repositoryId),
      method: 'get',
      headers: {
        'X-CCAsset-Language': 'en'
      }
    };
    self._occ.request(options, function(err, response) {
      if (err) return callback(err);
      fs.outputFile(path.join(widgetPath, 'widget.json'), JSON.stringify(response.metadata, null, '  '), callback);
    });
  } else {
    var widget = widgetInfo.item;
    var metadata = {};
    var baseKeys = ["widgetType", "version", "displayName"]
    baseKeys.forEach(key => {
      metadata[key] = widget[key]
    })

    metadata.elementized = !!widget.layouts.length
    fs.outputFile(path.join(widgetPath, 'widget.json'), JSON.stringify(metadata, null, '  '), callback);
  }
}

function downloadLocales(widgetInfo, settings, callback) {
  var self = this;
  winston.info('Downloading %s locales files...', widgetInfo.item.widgetType);
  var localesPath = path.join(getWidgetPath(settings, widgetInfo), 'locales');
  var urlTemplate = 'widgetDescriptors/%s/locale/%s';

  async.each(
    settings.locales || ["en"],
    function (locale, cb) {
      var options = {
        api: util.format(urlTemplate, widgetInfo.item.repositoryId, locale),
        method: 'get',
        headers: {
          'X-CCAsset-Language': locale
        }
      };
      self._occ.request(options, function(err, data) {
        if (err) return cb(err);
        fs.outputFile(path.join(localesPath, locale, `ns.${widgetInfo.item.i18nresources}.json`), JSON.stringify(data.localeData, null, 2), cb);
      });
    },
    callback
  );
}

function downloadConfig(widgetInfo, settings, callback) {
  var self = this;
  winston.info('Downloading config for %s...', widgetInfo.item.widgetType);
  var configUrl = util.format('widgetDescriptors/%s/metadata/config', widgetInfo.item.repositoryId);
  var configPath = path.join(getWidgetPath(settings, widgetInfo), 'config');

  var downloadConfigLocales = function() {
    var urlTemplate = 'widgetDescriptors/%s/metadata/config/locale/%s';
    async.each(
      settings.locales || ["en"],
      function (locale, cb) {
        var options = {
          api: util.format(urlTemplate, widgetInfo.item.repositoryId, locale),
          method: 'get',
          headers: {
            'X-CCAsset-Language': locale
          }
        };
        self._occ.request(options, function(err, data) {
          if (err) return cb(err);
          fs.outputFile(path.join(configPath, 'locales', `${locale}.json`), JSON.stringify(data.localeData, null, 2), cb);
        });
      },
      callback
    );
  }

  self._occ.request(configUrl, function(err, response) {
    if (err) return callback(err);

    fs.outputFile(path.join(configPath, 'config.json'), JSON.stringify(response.metadata, null, 2), downloadConfigLocales);
  });
}

/**
 * Download a single widget.
 * @param  {Object}   widgetInfo The widget info received from OCC.
 * @param  {Function} callback   The fn to executed efter download.
 */
function downloadWidget(widgetInfo, globalElementTags, widgetInstances, settings, callback) {
  var self = this;
  winston.info('Downloading widget %s...', widgetInfo.item.widgetType);
  if (widgetInfo.item.instances.length <= 0) {
    winston.warn('No instances available for widget %s.', widgetInfo.item.widgetType);
    return callback();
  }

  async.parallel([
    function(callback) {
      downloadTemplate.call(self, widgetInfo, settings, callback);
    },
    function(callback) {
      downloadLess.call(self, widgetInfo, settings, callback);
    },
    function(callback) {
      if (widgetInfo.folder === 'oracle') return callback();
      downloadAllJs.call(self, widgetInfo, settings, callback);
    },
    function(callback) {
      writeDescriptor.call(self, widgetInfo, settings, callback);
    },
    function(callback) {
      if (widgetInfo.folder === 'oracle') return callback();
      downloadLocales.call(self, widgetInfo, settings, callback);
    },
    function(callback) {
      if (widgetInfo.folder === 'oracle') return callback();
      downloadConfig.call(self, widgetInfo, settings, callback);
    },
    function(callback) {
      if (widgetInfo.folder === 'oracle') return callback();
      downloadWidgetElements.call(self, widgetInfo, globalElementTags, widgetInstances, settings, callback);
    }
  ], callback);
}

/**
 * Download the list of widgets passed by argument.
 * @param  {Array}   widgetsInfo The list of widgets info received from OCC.
 * @param  {Function} callback    The fn to be executed after download.
 */
function downloadWidgets(widgetsInfo, globalElementTags, widgetInstances, settings, callback) {
  var self = this;
  var widgetsCount = widgetsInfo.length;
  var currentCount = 0;
  var dw = function(widgetInfo, callback) {
    winston.info('Widget %d of %d', ++currentCount, widgetsCount);
    downloadWidget.call(self, widgetInfo, globalElementTags, widgetInstances, settings, callback);
  };

  async.each(widgetsInfo, dw, callback);
}

const fetchWidgetInstances = function(widgets, globalElementTags, callback) {
  var self = this;
  winston.info('Fetching widget instances...');

  const instances = widgets.map(widget => widget.item.instances);
  const allInstances = [].concat.apply([], instances);
  const allInstanceIds = allInstances.map(instance => instance.repositoryId);

  const promises = allInstanceIds.map(instance =>
    new Promise((resolve, reject) => {
      self._occ.request(`widgets/${instance}`, (err, response) => {
        if (err) return reject(err);

        resolve(response)
      });
    })
  );

  Promise.all(promises)
    .then(result => callback(null, widgets, globalElementTags, result))
    .catch(e => callback(e));
};

module.exports = function (widgetId, settings, callback) {
  var self = this;
  var fetchWidgetsInfo = function(cb) {
    widgetsInfo.call(self, widgetId, cb);
  };

  async.waterfall([
    fetchWidgetsInfo.bind(self),
    fetchGlobalElements.bind(self),
    fetchWidgetInstances.bind(self),
    function (widgetsInfo, globalElementTags, widgetInstances, callback) {
      downloadWidgets.call(self, widgetsInfo, globalElementTags, widgetInstances, settings, callback);
    }
  ], callback);
};
