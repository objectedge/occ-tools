'use strict';

var fs = require('fs-extra');
var util = require('util');
var async = require('async');
var path = require('path');
var winston = require('winston');
var Glob = require('glob').Glob;
var webpack = require('webpack');
var os = require('os');
var _config = require('../config');
var projectSettingsFiles = _config.projectSettings['files-config'] || [];
var CleanCSS = require('clean-css');

// Number of parallel uploads
var PARALLEL_UPLOADS = 8;

/**
 * Get all local files based on a glob pattern
 *
 * @param {String} globPattern the glob pattern
 * @param {Function} callback the callback function
 */
function getFiles(globPattern, callback) {
  var options = {
    cwd: path.join(_config.dir.project_root, path.dirname(globPattern)),
    absolute: true
  };

  var globCallback = function (error, fileList) {
    if (error) {
      callback(error);
    }

    if (!fileList || !fileList.length) {
      callback(util.format('No file matching the pattern %s', globPattern));
    }

    callback(null, fileList);
  };

  new Glob(path.basename(globPattern), options, globCallback);
}

/**
 * Upload a file list to OCC in parallel
 *
 * @param {Object} settings command options
 * @param {Array} fileList list of file paths
 * @param {Function} callback callback function
 */
function uploadFiles(settings, fileList, callback) {
  var self = this;
  async.eachLimit(
    fileList,
    PARALLEL_UPLOADS,
    function (file, cb) {
      winston.info('Uploading file %s...', path.basename(file));
      var destination = util.format('/%s/%s', settings.folder, path.basename(file));
      async.waterfall([
        initFileUpload.bind(self, destination, settings),
        doFileUpload.bind(self, file, destination, settings)
      ], cb);
    }, callback);
}

/**
 * Initiate a file upload to OCC
 *
 * @param {String} destination OCC file destination
 * @param {Object} settings command options
 * @param {Function} callback callback function
 */
function initFileUpload(destination, settings, callback) {
  var options = {
    api: 'files',
    method: 'put',
    body: {
      filename: destination,
      segments: 1
    }
  };

  this._occ.request(options, function (error, data) {
    return callback(error, data.token);
  });
}

/**
 * Minify JSON file since Uglify can't do that
 *
 * @param {String} source file path
 * @returns {String} minified file content
 */
function minifyJSONFile(tempFileDir, tempFilePath, source) {
  var fileContent = fs.readFileSync(source, 'utf8');
  var result = JSON.stringify(JSON.parse(fileContent));
  fs.ensureDirSync(tempFileDir);
  fs.writeFileSync(tempFilePath, result);
  return tempFilePath;
}

/**
 * Generate temporary minified file and return its path
 *
 * @param {Object} params options
 * @param {String} params.source main source
 * @param {Object} params.fileSettings the settings for the file
 * @returns {String} temp file path
 */
function generateBundleTempFile({ source, fileSettings }, callback) {
  var fileName = path.basename(source);
  var extension = path.extname(source);
  // Generate temp file
  var tempFileDir = path.join(os.tmpdir(), 'occ-tools-files');
  var tempFilePath = path.join(tempFileDir, fileName);

  // Process file
  var isJSON = /\.json/i.test(extension);
  var isCSS = /\.css/i.test(extension);
  var libraryTarget = fileSettings.libraryTarget ? fileSettings.libraryTarget : 'amd';

  if (isJSON) {
    callback(null, minifyJSONFile(tempFileDir, tempFilePath, source))
  } else if(isCSS) {
    cssBundle({
      'source': source,
      'dir': tempFileDir,
      'name': fileName,
      'tempFilePath': tempFilePath
    }, callback);
  }  else {
    jsBundle({
      'source': source,
      'dir': tempFileDir,
      'name': fileName,
      'tempFilePath': tempFilePath,
      'libraryTarget': libraryTarget
    }, callback);
  }
}

function getFileSetting(source) {
  return projectSettingsFiles.find(file => path.join(_config.dir.project_root, file.path) === source) || {};
}

/**
 * Actually upload the file to OCC
 *
 * @param {String} source the local file path
 * @param {String} destination the OCC file path
 * @param {String} token the token for file upload
 * @param {Function} callback the callback function
 */
function doFileUpload(source, destination, settings, token, callback) {
  var self = this;
  async.waterfall([
    // read the file as base64
    function (callback) {
      var extension = path.extname(source);
      var fileSettings = getFileSetting(source);
      var shouldMinify = !settings.no_minify && /(\.js|\.css)/.test(extension);

      if(fileSettings.transpile !== 'undefined') {
        shouldMinify = fileSettings.transpile;
      }

      var target = source;
      if(shouldMinify) {
        generateBundleTempFile({ source, settings, fileSettings }, function(error, filePath) {
          return callback(error, filePath);
        });
      } else {
        return callback(null, target);
      }
    },
    function(file, callback) {
      fs.readFile(file,'utf8', function (error, file) {
        return callback(error, new Buffer(file).toString('base64'));
      });
    },
    // upload the file to OCC
    function (file, callback) {
      self._occ.request({
        api: '/files/' + token,
        method: 'post',
        body: {
          filename: destination,
          token: token,
          index: 0,
          file: file
        }
      }, function (error, data) {
        return callback(error, data);
      });
    }
  ], callback);
}

/**
 * Bundle JS file
 * @param  {Object}   options Generate options
 * @param  {Function} done   on done the process
 */
function jsBundle(options, done) {
  var occToolsModulesPath = path.join(_config.occToolsPath, '..', 'node_modules');

  var plugins = [];
  plugins.push(new webpack.dependencies.LabeledModulesPlugin());
  plugins.push(new webpack.optimize.UglifyJsPlugin({
    compress: {
      warnings: false
    },
    output: {
      comments: false
    }
  }));

  plugins.push(new webpack.DefinePlugin({
    __ASSETS_VERSION__: `"${_config.assetsVersion}"`
  }));

  var entryFile = options.source;
  var outputFile = options.tempFilePath;

  var webpackConfigs = {
    resolveLoader: {
      root: [
        occToolsModulesPath
      ]
    },
    entry: entryFile,
    output: {
      path: options.dir,
      filename: options.name,
      libraryTarget: options.libraryTarget
    },
    externals: [
      /^((\/file)|(\/oe-files)|(\/ccstorex?)|(?!\.{1}|occ-components|(.+:\\)|\/{1}[a-z-A-Z0-9_.]{1})).+?$/
    ],
    module: {
      loaders: [{
        test: /\.js$/,
        loader: 'babel-loader',
        include: [
          _config.dir.project_root
        ],
        query: {
          presets: [path.join(occToolsModulesPath, 'babel-preset-es2015')],
          plugins: [
            path.join(occToolsModulesPath, 'babel-plugin-transform-decorators-legacy'),
            path.join(occToolsModulesPath, 'babel-plugin-transform-class-properties')
          ],
          cacheDirectory: true
        }
      }]
    },
    plugins: plugins
  };

  var bundler = webpack(webpackConfigs);

  bundler.run(function (error, stats) {
    winston.info('[bundler:compile] %s', stats.toString({
      chunks: true, // Makes the build much quieter
      colors: true
    }));

    if (error) {
      done(error, null);
      return;
    }

    done(null, outputFile);
  });
}

/**
 * Bundle CSS file
 * @param  {Object}   options Generate options
 * @param  {Function} done   on done the process
 */
function cssBundle(options, done) {
  var cleanCSSOptions = {};
  var outputFile = options.tempFilePath;
  var tempFileDir = options.dir;

  var fileContent = fs.readFileSync(options.source, 'utf8');
  var result = fileContent.toString();
  var output = new CleanCSS(cleanCSSOptions).minify(result);

  if (output.errors && output.errors.length > 0) {
    done(output.errors.toString(), null);
    return;
  }

  if (output.warnings && output.warnings.length > 0) {
    done(output.warnings.toString(), null);
    return;
  }

  fs.ensureDirSync(tempFileDir);
  fs.writeFileSync(outputFile, output.styles);

  done(null, outputFile);
}

/**
 * Upload multiple files to OCC
 *
 * @param {String} globPattern the glob pattern
 * @param {Object} settings the command settings
 * @param {Function} callback the callback function
 */
module.exports = function (globPattern, settings, callback) {

  async.waterfall([
    getFiles.bind(this, globPattern),
    uploadFiles.bind(this, settings)
  ], callback);
};
