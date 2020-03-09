'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var path = require('path');
var fs = require('fs-extra');
var async = require('async');
var os = require('os');
var glob = require('glob');
var walk = require('walkdir');
var winston = require('winston');

var appConfig = require('../config');
var Compiler = require('./compiler');

function Bundler(options) {
  var self = this;

  EventEmitter.call(self);

  self.compiler = new Compiler(options);
  self.options = options || {};
}

util.inherits(Bundler, EventEmitter);

function loadWidgets(options, done) {
  var basePath = path.join(appConfig.dir.project_root, 'widgets/**/*');
  var widgetsList = [];
  var widgetsByOptions = options.widgets ? options.widgets.split(',') : false;

  glob(basePath)
    .on('match', function (widgetPath) {
      var widgetMeta = {};

      try {
        widgetMeta = fs.readJsonSync(path.join(widgetPath, 'widgetMeta.json'));
      } catch(error) {}

      try {
        var widgetConfig = fs.readJsonSync(path.join(widgetPath, 'widget.json'));
        var widgetName = widgetConfig.widgetType || path.basename(widgetPath);
        var baseEntryPath = path.join(widgetPath, options.source);

        try {
          fs.accessSync(baseEntryPath + '-src', fs.F_OK);
          baseEntryPath = baseEntryPath + '-src';
        } catch (e) {
          winston.debug(e);
        }

        var destinationDir = path.join(widgetPath, options.dest);

        //Transpile only the widgets passed as option
        if(widgetsByOptions && widgetsByOptions.indexOf(widgetName) < 0) {
          return;
        }

        widgetsList.push({
          name: widgetName,
          basePath: widgetPath,
          baseEntryPath: baseEntryPath,
          entryPath: path.join(baseEntryPath, widgetMeta.ES6 ? 'index' : widgetConfig.javascript + '.js'),
          destinationDir: destinationDir,
          compiledFileName: path.join(destinationDir, options.compiledFileName || widgetConfig.javascript + '.js')
        });
      } catch(err) {
        winston.debug(err);
      }
    })
    .on('end', function () {
      done(widgetsList);
    });
}

/**
 * Create the index file containing the app level
 * dependencies
 * @param  {Array} filesList each file
 * @return {String}           the index file content
 */
function createJsBundleIndexFile(filesList) {
  var appLevelIndexTemplate = fs.readFileSync(path.join(__dirname, '../extension/templates/app-level-index.js'), 'utf-8');

  var dependenciesImports = [];
  var allDependencies = [];
  var dependenciesApp = [];

  filesList.forEach(function (fileObject) {
    var fileName = fileObject.fileName;

    dependenciesImports.push("import " + fileName + " from '" + fileObject.path + "';");
    allDependencies.push(fileName);
    dependenciesApp.push("app['" + fileName + "'] = " + fileName + ";");
  });

  dependenciesImports = dependenciesImports.join('\n');
  allDependencies = allDependencies.join(',');
  dependenciesApp = dependenciesApp.join('\n');

  appLevelIndexTemplate = appLevelIndexTemplate.replace(/#dependenciesImports/g, dependenciesImports);
  appLevelIndexTemplate = appLevelIndexTemplate.replace(/#allDependencies/g, allDependencies);
  appLevelIndexTemplate = appLevelIndexTemplate.replace(/#dependenciesApp/g, dependenciesApp);

  return appLevelIndexTemplate;
}

function createAppLevelIndex(appLevelName, appLevelPath, done) {
  var filesList = [];
  var outputPath = path.join(appConfig.dir.project_root, '.occ-transpiled', 'app-level', appLevelName);
  var appLevelEntry = path.join(outputPath, 'index.js');
  var currentAppLevelExtensionDir = path.join(appLevelPath);
  var configs = {};
  var configsPath = path.resolve(appLevelPath, 'configs.json');

  if (fs.existsSync(configsPath)) {
    var contents = fs.readFileSync(configsPath, 'utf8');

    try {
      contents = JSON.parse(contents);

      if (contents) {
        configs = Object.assign({}, configs, contents);
      }
    } catch(err) {
      winston.error(util.format('Error parsing appLevel configuration file. Please check %s configuration\'s integrity.', appLevelName));
    }
  }

  walk(currentAppLevelExtensionDir).on('file', function (item) {
    if (new RegExp(configsPath).test(item)) return;

    if(/\.js/.test(item)) {
      var jsName = path.basename(item, '.js');

      if (/vendors/.test(item) && !/\.min\.js/.test(item) && configs.uglify !== false) {
        var minifiedFile = UglifyJS.minify(item, configs.uglify);
        var tempFileDir = path.join(outputPath, 'vendors');

        item = item.resolve(tempFileDir, jsName + '.min.js');

        fs.ensureDirSync(tempFileDir);
        fs.writeFileSync(item, minifiedFile.code);
      }

      jsName = jsName.replace(/[^\w\s]/g, '');

      filesList.push({
        fileName: jsName,
        path: item
      });
    }
  }).on('end', function () {
    var appLevelIndexTemplate = createJsBundleIndexFile(filesList);
    fs.ensureDirSync(outputPath);

    fs.writeFile(appLevelEntry, appLevelIndexTemplate, { encoding: 'utf8' }, function (error) {
      if(error) {
        winston.error('Error on generating app-level: ' + error);
        return;
      }

      done(appLevelEntry, outputPath, appLevelName);
    });
  });
};

function loadAppLevelFiles(options, done) {
  var appLevelBasePath = path.join(appConfig.dir.project_root, 'app-level');
  var appLevelPaths = [];

  glob(path.join(appLevelBasePath, '*'))
  .on('match', function (appLevelPath) {
    appLevelPaths.push(appLevelPath);
  })
  .on('end', function () {
    var promises = [];

    appLevelPaths.forEach(function (appLevelPath) {
      promises.push(new Promise((resolve) => {
        createAppLevelIndex(path.basename(appLevelPath), appLevelPath, function(appLevelEntry, outputPath, appLevelName, appLevelIndexTemplate) {
          resolve({ name: appLevelName, entry: appLevelEntry, appLevelPath });
        });
      }));
    });

    Promise.all(promises).then(done);
  })
};

Bundler.prototype.compile = function(options) {
  var self = this;
  options = options || self.options;

  async.waterfall([
    function(next) {
      loadWidgets(options, function (widgetsList) {
        options.widgetsList = widgetsList;
        next();
      });
    },
    function(next) {
      if(!options.appLevel) {
        return next();
      }

      loadAppLevelFiles(options, function(appLevelFiles) {
        options.appLevelFilesList = appLevelFiles;
        next();
      })
    },
    function(next) {
      self.compiler.setConfigs(options, next);
    },
    function(configs, next) {
      self.compiler.defineCompiler(next);
    },
    function(bundlerConfigs, next) {
      if(options.watch) {
        self.compiler.watch({
          aggregateTimeout: options.aggregateTimeout || 300,
          poll: typeof options.polling === 'undefined' ? true : options.polling
        }, next);
        return;
      }

      self.compiler.run(next);
    },
    function(bundlerStats) {
      self.emit('complete', bundlerStats);
    }
  ], function(error) {
    if(error) {
      self.emit('error', error);
    }
  });
};

module.exports = Bundler;
