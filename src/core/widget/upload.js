'use strict';

var fs = require('fs-extra');
var path = require('path');
var util = require('util');
var winston = require('winston');
var webpack = require('webpack');
var async = require('async');
var UglifyJS = require('uglify-js');
var _configs = require('../config');
var execSync = require('child_process').execSync;

var widgetsInfo = require('./info');
var _uploadFile = require('../files/upload');
var Bundler = require('../bundler');
var widgetBasePath = null;

function transpileWidget(widgetName, done) {
  var bundler = new Bundler({
    source: '/js',
    debug: false,
    dest: '/js',
    watch: false,
    polling: false,
    sourceMapType: '#source-map',
    widgets: widgetName
  });

  bundler.on('complete', function(stats) {
    winston.debug('\n\n');
    winston.debug('[bundler:compile] Changes ----- %s ----- \n', new Date());
    winston.debug('[bundler:compile] %s', stats.toString({
      chunks: true, // Makes the build much quieter
      colors: true
    }));

    done(null);
  });

  bundler.on('error', function(err) {
    winston.error('[bundler:error]', err);
    done(err);
  });

  bundler.compile();
}

/**
 * Upload the widget template files.
 * @param  {Object}   widgetInfo The widget info.
 * @param  {Function} callback   The fn to be executed after upload.
 */
function uploadTemplate(widgetInfo, callback) {
  var self = this;
  var templateFilePath = path.join(_configs.dir.project_root, 'widgets', widgetInfo.folder, widgetInfo.item.widgetType, 'templates', 'display.template');
  winston.info('Uploading "display.template" file for widget %s...', widgetInfo.item.widgetType);
  async.waterfall([
    function(callback) {
      fs.readFile(templateFilePath, 'utf8', callback);
    },
    function(fileData, callback) {
      var versionInfo = widgetInfo.versionInfo;
      var versionData = '<!-- Last uploaded: '+versionInfo.lastUploaded+' -->\n';
      versionData += '<!-- Latest commit: '+versionInfo.latestCommit+' -->\n';
      versionData += versionInfo.hasUnstagedChanges ? '<!-- CONTAINS UNSTAGED CHANGES -->\n' : '';

      fileData = versionData + fileData;

      var opts = {
        api: util.format('widgetDescriptors/%s/code', widgetInfo.item.id),
        method: 'put',
        qs: {
          updateInstances: true
        },
        body: {
          source: fileData
        }
      };
      if (widgetInfo.item.global){
        if (widgetInfo.item.instances.length > 0) {
          opts.api = util.format('widgets/%s/code', widgetInfo.item.instances[0].id);
          delete opts.qs;
        } else {
          winston.warn('No global instance to update the template');
          callback();
        }
      }

      self._occ.request(opts, function(err, data) {
        if (err) {
          return callback(err);
        } else if (data && data.errorCode) {
          return callback(util.format('%s: %s', widgetInfo.item.widgetType, data.message));
        } else {
          return callback();
        }
      });
    }
  ],
  function(err) {
    if (err) {
      return callback(err);
    }
    winston.info('Template uploaded for widget %s.', widgetInfo.item.widgetType);
    return callback();
  });
}

/**
 * Upload the widget LESS files.
 * @param  {Object}   widgetInfo The widget info.
 * @param  {Function} callback   The fn to be executed after upload.
 */
function uploadLess(widgetInfo, callback) {
  var self = this;
  async.waterfall([
    function(callback) {
      fs.readFile(path.join(_configs.dir.project_root, 'widgets', widgetInfo.folder, widgetInfo.item.widgetType, 'less', 'widget.less'), 'utf8', callback);
    },
    function(fileData, callback) {
      var instances = widgetInfo.item.instances;
      if (instances.length) {
        winston.info('Uploading LESS of %s %s...', instances.length, instances.length > 1 ? 'instances' : 'instance');

        async.eachLimit(widgetInfo.item.instances, 4, function(instance, callback) {
          var opts = {
            api: util.format('widgets/%s/less', instance.id),
            method: 'put',
            body: {
              source: fileData
            }
          };
          winston.info('Uploading LESS for instance %s', instance.id);

          self._occ.request(opts, function(err, data) {
            if (err){
              winston.error(err);
              return callback();
            }
            if (data && data.errorCode) {
              winston.error(data);
              return callback();
            }
            if (data && parseInt(data.status) >= 400) {
              winston.error(data);
              return callback();
              // return callback(util.format('%s: %s - %s', widgetInfo.item.widgetType, data.status, data.message));
            }
            winston.info('Uploaded LESS for instance %s', instance.id);
            return callback();
          });
        }, function(error) {
          if(error){
            return callback(error);
          } else {
            return callback(null, fileData);
          }
        });
      } else {
        winston.info('No instances to upload LESS for widget %s...', widgetInfo.item.widgetType);
        callback(null, fileData);
      }
    },
    function(fileData, callback) {
      var opts = {
        api: util.format('widgetDescriptors/%s/less', widgetInfo.item.id),
        method: 'put',
        // we cannot use this option because OCC will
        // automatically include a selector on the LESS
        // of already instatiated widgets
        // qs: {
        //   updateInstances: true
        // },
        body: {
          source: fileData
        }
      };
      self._occ.request(opts, function(err, data) {
        if (err){
          return callback(err);
        }
        if (data && data.errorCode) {
          return callback(util.format('%s: %s - %s', widgetInfo.item.widgetType, data.errorCode, data.message));
        }
        winston.info('Uploaded base LESS for widget %s', widgetInfo.item.id);
        return callback();
      });
    }
  ], function(err) {
    if(err){
      return callback(err);
    } else {
      winston.info('LESS files uploaded for widget %s.', widgetInfo.item.widgetType);
      return callback();
    }
  });
}

/**
 * Upload a single widget js file.
 * @param  {Object}   widgetInfo The widget info.
 * @param  {String}   jsFile     The js file descriptor object.
 * @param  {Function} callback   The fn to be executed after upload.
 */
function uploadJs(widgetInfo, jsFile, options, callback) {
  var self = this;
  winston.info('Uploading %s of widget %s...', jsFile.name,  widgetInfo.item.widgetType);

  var doTheRequest = function (opts, fileData, callback) {
    self._occ.request(opts, function(err, data) {
      if (err) {
        return callback(err, null);
      } else if (data && data.errorCode) {
        winston.warn('%s: %s', widgetInfo.item.widgetType, data.message);
      } else {
        return callback(null, fileData);
      }
    });
  };

  var uploadNormalJSFile = function (fileData, callback) {
    var jsFileName = jsFile.name;

    var opts = {
      api: util.format('widgetDescriptors/%s/javascript/%s', widgetInfo.item.id, jsFileName),
      method: 'put',
      body: {
        // will ignore all files that ends with '.min.js'
        source: fileData
      }
    };

    doTheRequest(opts, fileData, callback);
  };

  var uploadMinifiedJSFile = function (fileData, callback) {
    var entry = {};
    var jsFileNameWithExtension = jsFile.name;
    var jsFileName = jsFileNameWithExtension.replace('.js', '');
    var jsMinifiedFileNameWithExtension = jsFileNameWithExtension.replace('.js', '.min.js');
    var minFilePath = path.join(widgetBasePath, jsMinifiedFileNameWithExtension);
    var sourceMapFileName = jsMinifiedFileNameWithExtension + '.map';
    var remoteSourceMapURL = util.format('/file/oe-source-maps/%s/%s', widgetInfo.item.widgetType, sourceMapFileName);

    entry[path.join(jsFileName, 'js', jsFileName + '.min')] = path.join(widgetBasePath, jsFileNameWithExtension);

    var webpackConfigs = {
      devtool: 'source-map',
      entry: entry,
      output: {
        path: path.join(_configs.dir.project_root, 'widgets', widgetInfo.folder),
        filename: '/[name].js',
        sourceMapFilename: '/[name].js.map',
        libraryTarget: 'amd'
      },
      externals: [
        new RegExp('^(?!.*(' + jsFileNameWithExtension.replace(/\./g, '\\.') + '))', 'g')
      ],
      plugins: [new webpack.optimize.UglifyJsPlugin({
        include: /\.min\.js$/,
        compress: {
          warnings: false
        },
        output: {
          comments: false
        }
      })]
    };

    var bundler = webpack(webpackConfigs);

    bundler.run(function(err) {
      if(err) {
        callback(err, null);
        return;
      }

      fs.readFile(minFilePath, 'utf8', function (err, fileData) {
        if(err) {
          callback(err, null);
          return;
        }

        //Changing the source map path
        fileData = fileData.replace(new RegExp('sourceMappingURL=' + sourceMapFileName, 'g'), 'sourceMappingURL=' + remoteSourceMapURL);

        var opts = {
          api: util.format('widgetDescriptors/%s/javascript/%s', widgetInfo.item.id, jsMinifiedFileNameWithExtension),
          method: 'put',
          body: {
            source: fileData
          }
        };

        //Updating the minified file content at oracle's servers
        doTheRequest(opts, fileData, callback);
      });
    });
  };

  var uploadJSFile = function (fileData, min, callback) {
    if(!min) {
      uploadNormalJSFile(fileData, callback);
    } else {
      uploadMinifiedJSFile(fileData, callback);
    }
  };

  async.waterfall([
    function(callback) {
      fs.readFile(path.join(widgetBasePath, jsFile.name), 'utf8', callback);
    },
    function(fileData, callback) {
      uploadJSFile(fileData, false, callback);
    },
    function(fileData, callback) {
      if(options.minify) {
        winston.debug('"%s": Replacing the Oracle\'s minified file and uploading the OE js "%s"...', widgetInfo.item.widgetType, jsFile.name);
        uploadJSFile(fileData, true, callback);
        return;
      }

      callback(null);
    }
  ], function(err) {
    if(err) return callback(err);
    return callback();
  });
}

/**
 * Upload all widget js files.
 * @param  {Object}   widgetInfo The widget info.
 * @param  {Function} callback   The fn to be executed after upload.
 */
function uploadAllJs(widgetInfo, options, callback) {
  var self = this;
  var describeJsPath = util.format('widgetDescriptors/%s/javascript', widgetInfo.item.id);

  //Oracle tries to uglify every js file inside /js folder so, we're uploading the source map to a
  //specific path into the oracle's files system
  var uploadSourceMap = function (fileName, callback) {
    var jsSourceMapFileName = fileName.replace('.js', '.js.map');
    var jsSourceMapPath = path.join(widgetBasePath, jsSourceMapFileName);
    var remoteSourceMapPath = util.format('/oe-source-maps/%s/%s', widgetInfo.item.widgetType, jsSourceMapFileName);

    try {
      fs.accessSync(jsSourceMapPath, fs.F_OK);
      winston.info('Uploading source map "%s" file...', jsSourceMapFileName);
      winston.debug('uploading source map "%s" of the file "%s" to:\n\t\t /file%s', jsSourceMapFileName, fileName, remoteSourceMapPath);
      _uploadFile.call(self, jsSourceMapPath, remoteSourceMapPath, function (err, result) {
        if(err) {
          callback(result);
        } else {
          callback(null);
        }
      });
    } catch (e) {
      callback(null);
    }
  };

  var upJs = function(jsFile, callback) {
    async.parallel([
      function (callback) {
        uploadJs.call(self, widgetInfo, jsFile, options, callback);
      },
      //Upload source map of the default js
      function (callback) {
        uploadSourceMap(jsFile.name, callback);
      },
      //Upload the source map of the minified js
      function(response, callback) {
        if(typeof callback !== 'undefined' && response) {
          callback(response);
          return;
        }
        callback = response;

        var jsMinifiedName = jsFile.name.replace('.js', '.min.js');
        uploadSourceMap(jsMinifiedName, callback);
      }
    ],
    function(err) {
      if(err) return callback(err);

      if(options.minify) {
        var jsMinifiedNameWithExtension = jsFile.name.replace('.js', '.min.js');
        var jsMinifiedPath = path.join(widgetBasePath, jsMinifiedNameWithExtension);

        //Removing the minified and the map files
        fs.removeSync(jsMinifiedPath);
        fs.removeSync(jsMinifiedPath + '.map');
      }

      return callback();
    });
  };

  self._occ.request(describeJsPath, function(err, data) {
    if (err) return callback(err);
    if (data.message && data.status) return callback(new Error(util.format('%s: %s', data.status, data.message)));
    async.each(data.jsFiles, upJs, function(err) {
      if (err) return callback(err);
      winston.info('All javascript files uploaded.');
      return callback();
    });
  });
}

/**
 * Upload the element files.
 *
 * @TODO FIX upload elements behavior
 *
 * @param  {Object}   widgetInfo The widget info.
 * @param  {Function} callback   The fn to be executed after upload.
 */
function uploadElements(widgetInfo, callback) {
  var self = this;

  var elementsBasePath = path.join(_configs.dir.project_root, 'widgets', widgetInfo.folder, widgetInfo.item.widgetType, 'element');

  try {
    var elementList = fs.readdirSync(elementsBasePath);

    var uploadElement = function(elementName, callback) {
      var elementObj = {
        elementName,
        elementJs: path.join(elementsBasePath, elementName, 'js', 'element.js'),
        elementTemplate: path.join(elementsBasePath, elementName, 'templates', 'template.txt'),
        elementTag: fs.readJsonSync(path.join(elementsBasePath, elementName, 'element.json')).tag
      };

      async.waterfall([
        function (callback) {
          try {
            fs.accessSync(elementObj.elementJs, fs.F_OK);
            uploadSingleElementJS.call(self, widgetInfo, elementObj, callback);
          } catch (e) {
            callback();
          }
        },
        function (callback) {
          uploadSingleElementTemplate.call(self, widgetInfo, elementObj, callback);
        }
      ],
      function(err) {
        if(err) return callback(err);
        return callback();
      });
    };

    async.each(elementList, uploadElement, function(err) {
      if (err) return callback(err);
      winston.info('"%s": element uploaded.');
      return callback();
    });
  } catch(err) {
    return callback();
  }
}

/**
 * Upload a single element JS.
 * @param  {Object}   widgetInfo The widget info.
 * @param  {String}   elementObj     The element descriptor object.
 * @param  {Function} callback   The fn to be executed after upload.
 */
function uploadSingleElementJS(widgetInfo, elementObj, callback) {
  var self = this;
  winston.info('"%s": Uploading element "%s"...', widgetInfo.item.widgetType, elementObj.elementName);

  var doTheRequest = function (opts, elementJsData, callback) {
    self._occ.request(opts, function(err, data) {
      if (err) {
        return callback(err, null);
      } else if (data && data.errorCode) {
        winston.warn('%s: %s', elementObj.elementName, data.message);
        return callback(data, null);
      } else {
        return callback(null, elementJsData);
      }
    });
  };

  var uploadElementJS = function (elementJsData, callback) {
    var elementTag = elementObj.elementTag;
    var opts = {
      api: util.format('widgetDescriptors/%s/element/%s/javascript/', widgetInfo.item.id, elementTag),
      method: 'put',
      body: {
        // will ignore all files that ends with '.min.js'
        code: {
          javascript: elementJsData
        }
      },
      headers: {
        'x-ccasset-language': 'en'
      }
    };

    doTheRequest(opts, elementJsData, callback);
  };

  async.waterfall([
    function(callback) {
      fs.readFile(elementObj.elementJs, 'utf8', callback);
    },
    function(elementJsData, callback) {
      uploadElementJS(elementJsData, callback);
    }
  ], function(err) {
    if(err) return callback(err);
    winston.info('"%s": "%s" uploaded.', widgetInfo.item.widgetType, elementObj.elementName);
    return callback();
  });
}

/**
 * Upload a single element Template.
 * @param  {Object}   widgetInfo The widget info.
 * @param  {String}   elementObj     The element descriptor object.
 * @param  {Function} callback   The fn to be executed after upload.
 */
function uploadSingleElementTemplate(widgetInfo, elementObj, callback) {
  var self = this;
  winston.info('"%s": Uploading element "%s"...', widgetInfo.item.widgetType, elementObj.elementName);

  var doTheRequest = function (opts, elementJsData, callback) {
    self._occ.request(opts, function(err, data) {
      if (err) {
        return callback(err, null);
      } else if (data && data.errorCode) {
        winston.warn('%s: %s', elementObj.elementName, data.message);
        return callback(data, null);
      } else {
        return callback(null, elementJsData);
      }
    });
  };

  var uploadElementTemplate = function (elementTemplateData, callback) {
    var elementTag = elementObj.elementTag;
    var opts = {
      api: util.format('widgetDescriptors/%s/element/%s/template/', widgetInfo.item.id, elementTag),
      method: 'put',
      body: {
        // will ignore all files that ends with '.min.js'
        code: {
          template: elementTemplateData
        }
      },
      headers: {
        'x-ccasset-language': 'en'
      }
    };

    doTheRequest(opts, elementTemplateData, callback);
  };

  async.waterfall([
    function(callback) {
      fs.readFile(elementObj.elementTemplate, 'utf8', callback);
    },
    function(elementTemplateData, callback) {
      uploadElementTemplate(elementTemplateData, callback);
    }
  ], function(err) {
    if(err) return callback(err);
    winston.info('"%s": "%s" uploaded.', widgetInfo.item.widgetType, elementObj.elementName);
    return callback();
  });
}

/**
 * Upload the widgets locales.
 * @param  {Object}   widgetInfo  The widget info.
 * @param  {Object}   options     The options for uplaod the locales, Whether single or all.
 * @param  {Function} callback    The fn to be executed after upload.
 */
function uploadLocale(widgetInfo, options, callback) {
  var self = this;
  async.waterfall([
    function(callback) {
      if(!options.locales) {
        fs.readdir(path.join(_configs.dir.project_root, 'widgets', widgetInfo.folder, widgetInfo.item.widgetType, 'locales'), 'utf8', callback);
      } else {
        var folderListData = options.locales.split(',');
        callback(null, folderListData);
      }
    },
    function(folderListData, callback) {
      async.eachLimit(folderListData, 8, function(folderName, callback) {
        winston.info('Uploading locales %s for widget %s...', folderName, widgetInfo.item.widgetType);
        async.waterfall([
          function(callback) {
            fs.readFile(path.join(_configs.dir.project_root, 'widgets', widgetInfo.folder, widgetInfo.item.widgetType, 'locales', folderName, 'ns.' + (widgetInfo.item.i18nresources || widgetInfo.item.widgetType) + '.json'), 'utf8', callback);
          },
          function(fileData, callback) {
            var opts = {
              api: util.format('widgetDescriptors/%s/locale/%s', widgetInfo.item.id, folderName),
              method: 'put',
              qs: { updateInstances: true },
              headers: {
                'x-ccasset-language': folderName
              },
              body: {
                localeData: JSON.parse(fileData)
              }
            };
            self._occ.request(opts, function(err, data) {
              if (err) return callback(err);
              if (data && data.errorCode) {
                winston.warn('%s: %s - %s', widgetInfo.item.widgetType, data.errorCode, data.message);
              }
              if(options.locales) {
                winston.info('Uploaded locale %s for widget %s', folderName, widgetInfo.item.widgetType);
              }
              return callback();
            });
          }
        ], callback);
      }, function(err) {
        if (err) return callback(err);
        winston.info('All locales uploaded for widget %s.', widgetInfo.item.widgetType);
        return callback();
      });
    }
  ], callback);
}

/**
 * Will upload the entire widget.
 * @param  {Object}   widgetInfo The widget info.
 * @param  {Function} callback   The fn to be executed after upload.
 */
function uploadEntireWidget(widgetInfo, options, callback) {
  var self = this;

  async.parallel([
    function(callback) {
      widgetInfo.folder !== 'oracle' ? uploadAllJs.call(self, widgetInfo, options, callback) : callback();
    },
    function(callback) {
      uploadLess.call(self, widgetInfo, callback);
    },
    function(callback) {
      uploadTemplate.call(self, widgetInfo, callback);
    },
    function(callback) {
      uploadLocale.call(self, widgetInfo, options, callback);
    }
    // ,
    // function(callback) {
    //   uploadElements.call(self, widgetInfo, callback);
    // }
  ], callback);
}

/**
 * Will upload only the specified widget files.
 * @param  {Object}   widgetInfo The widget info.
 * @param  {Array}   files       The list of files to upload.
 * @param  {Function} callback   The fn to be executed after upload.
 */
function uploadWidgetIndividualFiles(widgetInfo, options, callback) {
  var self = this;
  async.each(options.files, function(file, callback) {
    if (file === 'template') {
      uploadTemplate.call(self, widgetInfo, callback);
    } else if (file === 'less') {
      uploadLess.call(self, widgetInfo, callback);
    } else if (file === 'js') {
      uploadAllJs.call(self, widgetInfo, options, callback);
    } else if (file.endsWith('.js')) {
      var jsFile = {
        name: file.substr(file.lastIndexOf('/') + 1) // send only the filename, without path
      };
      uploadJs.call(self, widgetInfo, jsFile, options, callback);
    } else if(file === 'locales') {
      uploadLocale.call(self, widgetInfo, options, callback);
    }
    // else if (file === 'elements') {
    //   uploadElements.call(self, widgetInfo, callback);
    // }
    else {
      return callback(new Error(util.format('Unknown file: %s', file)));
    }
  }, callback);
}

/**
 * Start widget uploading process.
 * @param  {Array}   widgetsInfo  The list of widgets info.
 * @param  {Object}   options     The options object.
 * @param  {Function} callback    The fn to be executed after uploading.
 */
function uploadWidgets(widgetsInfo, options, callback) {
  var self = this;

  var widgetUploadCurrentCount = 0;
  var widgetsCount = widgetsInfo.length;
  var uw = function(widgetInfo, callback) {
    winston.info('Uploading widget %s (%d of %d)...', widgetInfo.item.widgetType, ++widgetUploadCurrentCount, widgetsCount);

    widgetInfo.versionInfo = {};
    widgetInfo.versionInfo.lastUploaded = new Date();

    var commitHash = execSync('git rev-parse HEAD').toString().trim();
    widgetInfo.versionInfo.latestCommit = commitHash;

    var gitStatus = execSync('git status --porcelain').toString().trim();
    widgetInfo.versionInfo.hasUnstagedChanges = gitStatus.length > 0 ? true : false;

    async.waterfall([
      function(callback) {
        var widgetMetaFilePath = path.join(_configs.dir.project_root, 'widgets', widgetInfo.folder, widgetInfo.item.widgetType, 'widgetMeta.json');

        try {
          fs.accessSync(widgetMetaFilePath, fs.F_OK);
          fs.readJson(widgetMetaFilePath, function (err, fileData) {
            if(err) {
              callback(err);
              return;
            }

            callback(null, fileData);
          });
        } catch (e) {
          callback(null, {});
        }
      },
      function (fileData, callback) {
        if(fileData.ES6) {
          widgetBasePath = path.join(_configs.dir.project_root, '.occ-transpiled', 'widgets', widgetInfo.item.widgetType);
          transpileWidget(widgetInfo.item.widgetType, callback);
        } else {
          widgetBasePath = path.join(_configs.dir.project_root, 'widgets', widgetInfo.folder, widgetInfo.item.widgetType, 'js');
          callback(null);
        }
      }
    ], function (err) {
      if(err) {
        callback(err);
        return;
      }

      options.files ?
        uploadWidgetIndividualFiles.call(self, widgetInfo, options, callback) :
        uploadEntireWidget.call(self, widgetInfo, options, callback);
    });
  };

  async.timesSeries(options.times, function(count, next) {
    if (options.times > 1) {
      winston.info('Uploading %d of %d', count + 1, options.times);
    }
    widgetUploadCurrentCount = 0;
    async.each(widgetsInfo, uw, next);
  }, callback);
}

module.exports = function(widgetId, options, callback) {
  var self = this;
  options = options || {};
  options.times = options.times || 1;
  options.minify = options.minify || false;


  var fetchWidgetsInfo;
  if (!options.info){
    fetchWidgetsInfo = function(callback) {
      widgetsInfo.call(self, widgetId, callback);
    };
  } else {
    fetchWidgetsInfo = function(callback){
      var widgetInfo =  options.info.filter(function(widgetInfo) {
        return widgetInfo.item.widgetType === widgetId;
      });
      callback(null, widgetInfo);
    };
  }


  async.waterfall([
    fetchWidgetsInfo.bind(self),
    function(widgetsInfo, callback) {

      if (widgetsInfo.length === 0) {
        winston.warn('No widget with name "%s" found in OCC.', widgetId);
        return callback();
      }

      uploadWidgets.call(self, widgetsInfo, options, callback);
    }
  ], callback);
};
