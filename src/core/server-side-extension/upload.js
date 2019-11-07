'use strict';

var fs = require('fs-extra');
var os = require('os');
var path = require('path');
var async = require('async');
var winston = require('winston');
var archiver = require('archiver');
var _config = require('../config');
var util = require('util');

module.exports = function(name, callback) {
  var self = this;

  // temporary zip file to be uploaded
  var tempFile = path.join(os.tmpdir(), util.format('%s.zip', name));

  // source path
  var sourceDir = path.join(_config.dir.server_side_root, name);

  /**
   * Checks if the resource folder exists locally.
   */
  var checkSSEPath = function(callback) {
    winston.info('Checking files consistency...');
    fs.lstat(sourceDir, (error) => {
      if (error) {
        callback('Extension does not exist locally.');
      }

      callback();
    });
  };

  /**
   * Writes the zip file with the resource.
   */
  var zipFiles = function(callback) {
    winston.info('Zipping files to upload...');
    var output = fs.createWriteStream(tempFile).on('close', function() {
      callback();
    });
    var archive = archiver('zip').on('error', function(error) {
      callback('Error while creating the zip file.');
    });

    archive.pipe(output);
    archive.glob(path.join('**', '*'), {
      cwd: sourceDir,
      ignore: ['package-lock.json']
    });
    archive.finalize();
  };

  /**
   * Uploads the resource to OCC.
   */
  var uploadToOCC = function(callback) {
    winston.info('Uploading %s server side extension...', name);

    var options = {
      api: 'serverExtensions',
      method: 'post',
      formData: {
        filename: name + '.zip',
        uploadType: 'extensions',
        force: 'true',
        fileUpload: fs.createReadStream(tempFile)
      }
    };
    self._occ.request(options, function(error, body) {
      self._occ.checkError(error, body, callback);

      callback();
    });
  };

  /**
   * Removes local temporary file.
   */
  var clearTemporaryFile = function(callback) {
    winston.info('Removing temporary files...');
    fs.unlink(tempFile, callback);
  };

  async.waterfall(
    [checkSSEPath, zipFiles, uploadToOCC, clearTemporaryFile],
    callback
  );
};
