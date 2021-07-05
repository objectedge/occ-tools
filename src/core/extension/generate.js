'use strict';

var fs = require('fs-extra');
var glob = require('glob');
var path = require('path');
var archiver = require('archiver');
var async = require('async');
var winston = require('winston');
var occConfigs = require('../config');

var getTemplate = require('./template');
var bundleAppLevel = require('../app-level/bundle');

var Bundler = require('../bundler');

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
 * Validate the options object.
 * @param  {Object}   options  The options object.
 * @param  {Function} callback The fn to be executed after validation.
 */
function validateOptions(options, callback) {

  if (!options.extensionId) {
    return callback(new Error('Extension ID not defined.'));
  }

  if (!options.dir) {
    return callback(new Error('Widgets root directory not specified.'));
  }

  if (!options.widgets) {
    return callback(new Error('List of widgets not specified.'));
  }

  fs.exists(options.dir, function(exists) {
    return callback(!exists ? new Error('Widgets root directory not exists.') : null);
  });
}

/**
 * Will generate a list of widget to be passed to archiver.
 * @param  {Object}   options  The options object.
 * @param  {Function} callback The fn to be executed after generation.
 */
function generateWidgetsList(options, callback) {
  async.map(options.widgets.split(','), function(widget, callback) {
    return callback(null, widget + '/**');
  }, callback);
}

function generateWidgetsExtension(options, widgetsList, archive, finalizeArchive, callback){
  var ignoreList = [
    '*/js-src/**',
    '*/src/**',
    '*/docs/**',
    '*/spec/**',
    '*/*.md',
    '*/*.zip',
    '*/VERSION',
    '*/widgetMeta'
  ];

  async.waterfall([
    function(callback) {
      var widgetMetaFilePath = path.join(options.dir, options.name, 'widgetMeta.json');

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
        callback(null);
      }
    },
    function (fileData, callback) {
      var processTranspiledWidget = function () {
        var widgetBasePath = path.join(occConfigs.dir.project_root, '.occ-transpiled', 'widgets', options.name);

        glob(path.join(widgetBasePath, '*'))
          .on('match', function (jsFilePath) {
            var outputFileName = path.basename(jsFilePath);

            try {
              var outputFileContent = fs.readFileSync(jsFilePath, 'utf-8');
              archive.append(outputFileContent, { name: path.join('widget', options.name, 'js', outputFileName) });
            } catch(error) {
              callback(error);
            }
          })
          .on('end', function () {
            ignoreList.push('*/js/**');
            callback(null);
          });
      };

      if(typeof fileData !== 'function' && fileData.ES6) {
        transpileWidget(options.name, processTranspiledWidget);
      } else {
        if(typeof fileData === 'function') {
          callback = fileData;
        }

        callback(null);
      }
    }
  ], function (err) {
    if(err) {
      callback(err);
      return;
    }


    widgetsList.forEach(function(item){
      archive.glob(
        item,
        {
          cwd: path.join(options.dir),
          ignore: ignoreList
        },
        { prefix: '/widget' }
      );
    });


    finalizeArchive();
  });
}

function generateAppLevelExtension(options, webpackFilesStats, archive, finalizeArchive){
  async.waterfall([
    bundleAppLevel.bundle.bind(this, options),
    function (outputFile, outputFileName, outputFilePath, entryFilePath, stats, callback) {
      webpackFilesStats = stats;

      try {
        var outputFileContent = fs.readFileSync(outputFile, 'utf-8');
        archive.append(outputFileContent, { name: path.join('/global/', outputFileName) });
      } catch(error) {
        winston.error(error);
      }

      if (stats && stats.es5) {
        callback();
      } else {
        bundleAppLevel.clear(outputFilePath, entryFilePath, callback);
      }
    }, function () {
      finalizeArchive();
    }
  ], finalizeArchive);
}


function generateConfigExtension(options, archive, finalizeArchive){
  async.waterfall([
    function (callback) {
      var sourceDir = path.join(options.dir, options.name);
      var destDir = path.join('/config', options.name);
      archive.directory(sourceDir, destDir);
      callback();
    }
  ], finalizeArchive);
}

function generateGatewayExtension(options, archive, finalizeArchive){
  async.waterfall([
    function (callback) {
      var sourceDir = path.join(options.dir, options.name);
      var destDir = path.join('/gateway', options.name);
      archive.directory(sourceDir, destDir);
      callback();
    }
  ], finalizeArchive);
}


/**
 * Generate the extension archive.
 * @param  {Object}   options      The options object.
 * @param  {String}   templateData The extension descriptor template data.
 * @param  {Array}   widgetsList   The list of widgets.
 * @param  {Function} callback     The fn to be executed after generation.
 */
function generateArchive(options, templateData, widgetsList, callback) {
  var extensionType;
  if (options.isAppLevel) {
    extensionType = 'app-level';
  } else if(options.isConfig) {
    extensionType = 'config';
  } else if (options.isGateway) {
    extensionType = 'gateway';
  } else {
    extensionType = 'widget';
  }

  var zipFileName = options.name + '.zip';
  var outputPath = options.output || options.dir;
  var outputDir;
  var output;

  // If 'output' flag was provided, we can assume the person wants to
  // overwrite the OOTB behavior
  // For 'config' and 'gateway' extension types, we will always create
  // inside the given dir
  if (options.output || extensionType === 'config' || extensionType === 'gateway') {
    outputDir = path.join(outputPath);
  } else {
    outputDir = path.join(outputPath, options.name);
  }

  // Force the directory tree to be created if it's not for 'output' option only
  if (options.output) {
    fs.ensureDirSync(outputDir);
  }

  // Creates the stream
  output = fs.createWriteStream(path.join(outputDir, zipFileName));

  var archive = archiver('zip');

  var webpackFilesStats = null;

  output.on('close', function () {
    if(webpackFilesStats) {
      winston.debug('[bundler:compile] %s', webpackFilesStats.toString({
        chunks: true, // Makes the build much quieter
        colors: true
      }));
    }

    winston.debug('Package %s generated with %s bytes', options.name + '.zip', archive.pointer());
    return callback();
  });

  archive.on('error', function(err) {
    return callback(err);
  });

  //generating the zip file
  archive.pipe(output);

  /**
   * Finalize the zip archive process
   */
  var finalizeArchive = function () {
    //creating the ext.json file
    archive.append(templateData, {name: 'ext.json'});
    archive.finalize();
  };

  switch (extensionType){
    case 'app-level':
      generateAppLevelExtension(options, webpackFilesStats, archive, finalizeArchive, callback);
      break;
    case 'config':
      generateConfigExtension(options, archive, finalizeArchive, callback);
      break;
    case 'gateway':
      generateGatewayExtension(options, archive, finalizeArchive, callback);
      break;
    case 'widget':
    default:
      generateWidgetsExtension(options, widgetsList, archive, finalizeArchive, callback);
      break;
  }
}

/**
 * Generate the extension bundle.
 * @param  {[type]}   options      The options object.
 * @param  {[type]}   templateData The extension descriptor template data.
 * @param  {Function} callback     The fn to be executed after generation.
 */
function generateExtension(options, templateData, callback) {
  winston.info('Generating package for ID: %s', options.extensionId);
  async.waterfall([
    function(callback) {
      generateWidgetsList(options, callback);
    },
    function(widgetsList, callback) {
      generateArchive(options, templateData, widgetsList, callback);
    }
  ], callback);
}

module.exports = function(options, callback) {
  async.waterfall([
    function(callback) {
      validateOptions(options, callback);
    },
    function(callback) {
      getTemplate(options.extensionId, options.name, options.datetime, callback);
    },
    function(templateData, callback) {
      generateExtension(options, templateData, callback);
    }
  ], callback);
};
