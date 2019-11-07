'use strict';

var fs = require('fs');
var util = require('util');
var async = require('async');
var path = require('path');
var winston = require('winston');
var Glob = require('glob').Glob;
var _config = require('../config');

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
        doFileUpload.bind(self, file, destination)
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
      segments: 1,
      uploadType: settings.folder
    }
  };

  this._occ.request(options, function (error, data) {
    return callback(error, data.token);
  });
}

/**
 * Actually upload the file to OCC
 *
 * @param {String} source the local file path
 * @param {String} destination the OCC file path
 * @param {String} token the token for file upload
 * @param {Function} callback the callback function
 */
function doFileUpload(source, destination, token, callback) {
  var self = this;
  async.waterfall([
    // read the file as base64
    function (callback) {
      fs.readFile(source, function (error, file) {
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