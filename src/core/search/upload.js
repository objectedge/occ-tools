'use strict';

var fs = require('fs-extra');
var os = require('os');
var path = require('path');
var async = require('async');
var winston = require('winston');
var archiver = require('archiver');
var _config = require('../config');

module.exports = function(resource, callback) {
  var self = this;

  // temporary zip file to be uploaded
  var tempFile = path.join(
    os.tmpdir(),
    'new-' + resource.replace(/\//g, '_') + '-' + new Date().getTime() + '.zip'
  );

  // source path
  var sourceDir = path.join(_config.dir.search_root, resource);

  /**
   * Checks if the resource folder exists locally.
   */
  var checkResourcePath = function(callback) {
    winston.info('Checking files consistency');
    fs.lstat(sourceDir, (err, stats) => {
      if(err){
        callback('The resource does not exist locally.');
      }
      callback();
    });
  };

  /**
   * Writes the zip file with the resource.
   */
  var zipFiles = function(callback) {
    winston.info('Zipping files to upload');
    var output = fs.createWriteStream(tempFile).on('close', function() {
      callback();
    });
    var archive = archiver('zip').on('error', function(err) {
      callback('Error creating the zip file.');
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  };

  /**
   * Uploads the resource to OCC.
   */
  var uploadToOCC = function(callback) {
    winston.info('Uploading %s search resource', resource);

    var options = {
      'api': resource,
      'method': 'post',
      'formData': { ':file': fs.createReadStream(tempFile) }
    };
    self._occ.request(options, function(error, body) {
      if (error) {
        winston.error(error);
        callback('Error uploading the search configurration');
      }

      if (body && body.hasOwnProperty('status') && body.status >= 400) {
        winston.error(body.message);
        callback('Error uploading the search configurration');
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

  async.waterfall(
    [checkResourcePath, zipFiles, uploadToOCC, clearTemporaryFile],
    callback
  );
};
