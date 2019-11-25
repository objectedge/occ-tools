var webpack = require('webpack');
var path = require('path');
var fs = require('fs-extra');
var util = require('util');
var appConfig = require('../config');
var winston = require('winston');
var github = require('../github');
var fetchingOCCCore = false;
var fetchOCCCoreQueue = [];

/**
 * Compiler constructor
 *
 * It sets the defaults configs
 *
 */
function Compiler() {
  this.configs = {
    allSet: false,
    defaultWidgetPathName: 'widgets',
    defaultWidgetCompanyName: 'objectedge',
    occToolsModulesPath: path.join(appConfig.occToolsPath, '..', 'node_modules'),
    externalsPattern: /^((\/file)|(\/oe-files)|(?!\.{1}|occ-components|(.+:\\)|\/{1}[a-z-A-Z0-9_.]{1})).+?$/,
    occComponentsTempDir: path.join(appConfig.dir.project_root, '.occ-components', 'widgets'),
    occWidgetCoreName: 'widget-core',
    occWidgetCoreImport: 'occ-components/widget-core'
  };

  this.configs.occWidgetCorePath = path.join(this.configs.occComponentsTempDir, this.configs.occWidgetCoreName);
}

/**
 * Check if all configs have been set
 * @return {Boolean} true if it's ready and false if it isn't
 */
Compiler.prototype.isItReady = function () {
  return this.configs.allSet;
};

/**
 * It runs the compile process after having all
 * configs defined and properly assigned
 *
 * @param  {Function} done Callback to deal with its states
 */
Compiler.prototype.run = function (done) {
  var self = this;

  if(!self.bundler) {
    done('Please define your bundler before running the compiler using the method defineCompiler.', null);
    return;
  }

  self.bundler.run(function(err, stats) {
    if(err) {
      done(err, null);
      return;
    }

    self.changeSourceMAPURL();
    done(null, stats);
  });
};

/**
 * Watch for file changes and bundle everything
 *
 * @param  {Object} options options to the watcher, which are polling and aggregateTimeout
 * @param  {Function} done Callback to deal with its states
 */
Compiler.prototype.watch = function (options, done) {
  var self = this;

  if(!self.bundler) {
    done('Please define your bundler before running the compiler using the method defineCompiler.', null);
    return;
  }

  self.bundler.watch(options, function(err, stats) {
    if(err) {
      done(err, null);
      return;
    }

    self.changeSourceMAPURL();
    done(null, stats);
  });
};

Compiler.prototype.changeSourceMAPURL = function () {
  var self = this;

  self.configs.widgetsList.forEach(function (widgetObject) {
    var jsFILESPath = widgetObject.compiledFileName.replace('.js', '');
    var sourceMapFiles = [util.format('%s.js.map', jsFILESPath), util.format('%s.min.js.map', jsFILESPath)];
    var remoteSourceMapURLBase = util.format('/file/oe-source-maps/%s/', widgetObject.name);

    sourceMapFiles.forEach(function (sourceMapPath) {    
      if(self.doesItExist(sourceMapPath)) {
        var fileName = path.basename(sourceMapPath);
        var jsFilePath = sourceMapPath.replace('.map', '');
        var fileSource = fs.readFileSync(jsFilePath, 'utf-8');
        var remoteSourceMapURL = path.join(remoteSourceMapURLBase, fileName);

        fileSource = fileSource.replace(new RegExp('sourceMappingURL=' + fileName, 'g'), 'sourceMappingURL=' + remoteSourceMapURL);
        fs.writeFileSync(jsFilePath, fileSource, { encoding: 'utf8' });
      }
    });
  });
};

/**
 * Sets all compiler required configurations
 * @param  {Function} done Callback to deal with its states
 */
Compiler.prototype.defineCompiler = function (done) {
  var self = this;
  var bundlerConfigs = {};
  var plugins = [];

  if(!self.isItReady()) {
    done('Please run setConfigs before running defineCompiler.', null);
    return false;
  }

  plugins.push(new webpack.dependencies.LabeledModulesPlugin());  

  self.configs.widgetsList.forEach(function (widgetObject) {
    plugins.push(new webpack.PrefetchPlugin(path.dirname(widgetObject.entryPath), self.configs.occWidgetCoreImport));
  });

  //Set occ-components path
  plugins.push(new webpack.NormalModuleReplacementPlugin(/occ-components/, function (moduleObject) {
    var moduleName = moduleObject.request.replace('occ-components/', '');
    var entryPoint = 'index.js';

    moduleObject.request = path.join(self.configs.occComponentsTempDir, moduleName, entryPoint);
  }));
    
  plugins.push(new webpack.optimize.UglifyJsPlugin({
    include: /\.min\.js$/,
    compress: {
      warnings: false
    },
    output: {
      comments: false
    }
  }));

  var entries = {};

  self.configs.widgetsList.forEach(function (widgetObject) {
    entries[path.join(widgetObject.name, widgetObject.name)] = widgetObject.entryPath;
    entries[path.join(widgetObject.name, widgetObject.name + '.min')] = widgetObject.entryPath;
  });

  var modulesInclude = self.configs.widgetsList.map(function (widgetObject) {
    return widgetObject.baseEntryPath;
  });
  modulesInclude.push(path.join(self.configs.occComponentsTempDir));
  
  bundlerConfigs = {
    resolveLoader: {
      root: [
        self.configs.occToolsModulesPath
      ]
    },
    resolve: {
      unsafeCache: true
    },
    entry: entries,
    output: {
      path: path.join(appConfig.dir.project_root, '.occ-transpiled', 'widgets'),
      filename: '/[name].js',
      libraryTarget: 'amd'
    },
    externals: [
      self.configs.externalsPattern
    ],
    module: {
      loaders: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          include: modulesInclude,
          loader: 'babel-loader',
          query: {
            presets: [path.join(self.configs.occToolsModulesPath, 'babel-preset-es2015')],
            plugins: [
              path.join(self.configs.occToolsModulesPath, 'babel-plugin-transform-decorators-legacy'),
              path.join(self.configs.occToolsModulesPath, 'babel-plugin-transform-class-properties')
            ],
            cacheDirectory: true
          }
        },
        {
          test: /\.html$/,
          exclude: /node_modules/,
          loader: 'html-loader',
          query: {
            minimize: false
          }
        }
      ]
    },
    plugins: plugins
  };

  bundlerConfigs.devtool = '#source-map';

  //Custom sourcemap
  if(self.configs.sourceMapType) {
    bundlerConfigs.devtool = self.configs.sourceMapType;
  }

  self.bundler = webpack(bundlerConfigs);
  done(null, bundlerConfigs);
};

/**
 * Check if the file or directory exists
 * @param  {String} widgetPath path to be verified
 * @return {Boolean} return true if the file exists and false if it doesn't
 */
Compiler.prototype.doesItExist= function (widgetPath) {
  try {
    fs.accessSync(widgetPath, fs.F_OK);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Sets all main configs that the Bundler needs
 * @param {Object} options Options to the Bundler
 * @param {Function} done Callback to deal with its states
 */
Compiler.prototype.setConfigs = function (options, done) {
  var self = this;

  self.configs.widgetsList = options.widgetsList;
  self.configs.debug = options.debug;
  self.configs.sourceMapType = options.sourceMapType;

  self.fetchOCCCore(function () {
    self.configs.allSet = true;
    done(null, self.configs);
  });
};

Compiler.prototype.fetchOCCCore = function (done) {
  var self = this;
  var remoteRootFolder = 'samples/widget-core';

  if(self.doesItExist(self.configs.occWidgetCorePath)) {
    done();
    return;
  }

  if(fetchingOCCCore) {
    fetchOCCCoreQueue.push(done);
    return;
  }
  
  fetchingOCCCore = true;
  github.list({
    repo: 'occ-components',
    remotePath: remoteRootFolder,
    each: function(err, fileMeta, callback) {
      if(err)  {
        callback(err, null);
        return;
      }

      var filePath = path.join(self.configs.occWidgetCorePath, path.relative(remoteRootFolder, fileMeta.path));
      var fileContent = new Buffer(fileMeta.content, 'base64').toString();

      winston.info('Creating widget-core file "%s"...', fileMeta.name);
      fs.outputFile(filePath, fileContent, callback);
    }
  }, function () {
    // Just give some extra time to ensure the file has already been created
    setTimeout(function () {
      done.apply(this, arguments);
    
      if(fetchOCCCoreQueue.length) {
        fetchOCCCoreQueue.forEach(function (itemDone) {
          itemDone();
        });
        fetchOCCCoreQueue = [];
      }
    }, 150);    
    
    fetchingOCCCore = false;
  });
};

module.exports = Compiler;
