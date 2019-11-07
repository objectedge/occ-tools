'use strict';

var fs = require('fs-extra');
var os = require('os');
var path = require('path');
var util = require('util');
var async = require('async');
var winston = require('winston');
var extract = require('extract-zip');
var _config = require('../config');

module.exports = function(sseName, settings, callback) {
  var self = this;

  var tempFile = path.join(os.tmpdir(), util.format('sse-%s-%s.zip', sseName, new Date().getTime()));

  var downloadFromOCC = function(callback) {
    winston.info('Downloading %s server-side extension', sseName);
    var options = {
      api: util.format('serverExtensions/%s.zip', sseName),
      method: 'get',
      body: false,
      download: tempFile
    };
    self._occ.request(options, function(error, body) {
      self._occ.checkError(error, body, callback);

      callback();
    });
  };

  var unzipFiles = function(callback) {
    winston.info('Unzipping the server-side extension');
    extract(
      tempFile,
      { dir: path.join(_config.dir.server_side_root, sseName) },
      function(err) {
        if (err) {
          callback('Error extracting the file: ' + err);
        }
        callback();
      }
    );
  };

  /**
   * Removes local temporary file.
   */
  var clearTemporaryFile = function(callback) {
    winston.info('Removing temporary files');
    fs.unlink(tempFile, callback);
  };

  async.waterfall([downloadFromOCC, unzipFiles, clearTemporaryFile], callback);
};
