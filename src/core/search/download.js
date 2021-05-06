'use strict';

var fs = require('fs-extra');
var os = require('os');
var path = require('path');
var util = require('util');
var async = require('async');
var winston = require('winston');
var extract = require('extract-zip');
var _config = require('../config');

module.exports = function(app, callback) {
  var self = this;

  // define a temp file for download
  var tempFile = path.join(os.tmpdir(), app + '-' + new Date().getTime() + '.zip');

  /**
   * Downloads search configuration from OCC.
   */
  var downloadFromOCC = function(callback) {
    winston.info('Downloading %s search app', app);
    var options = {
      api: util.format('%s.zip', app),
      method: 'get',
      download: tempFile,
    };
    self._occ.request(options, function(error, body){
      if (error){
        callback(error);
      }
      callback();
    });
  };

  /**
   * Unzip files on seach project folder.
   */
  var unzipFiles = function(callback) {
    winston.info('Unzipping the application');
    extract(tempFile, { dir: path.join(_config.dir.search_root, app) }, function (err) {
      if (err){
        callback('Error extracting the file: '+ err);
      }
      callback();
    });
  };

  /**
   * Removes local temporary file.
   */
  var clearTemporaryFile = function(callback) {
    winston.info('Removing temporary files');
    fs.unlink(tempFile, callback);
  };

  async.waterfall([ downloadFromOCC, unzipFiles, clearTemporaryFile ], callback);
};
