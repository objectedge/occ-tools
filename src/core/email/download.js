'use strict';

var fs = require('fs-extra');
var os = require('os');
var path = require('path');
var util = require('util');
var async = require('async');
var winston = require('winston');
var extract = require('extract-zip');
var _config = require('../config');

module.exports = function(emailId, settings, callback) {
  var self = this;

  // define a temp file for download
  var tempFile = path.join(os.tmpdir(), util.format('email-%s-%s.zip', emailId, new Date().getTime()));

  /**
   * Downloads email template from OCC.
   */
  var downloadFromOCC = function(callback) {
    winston.info('Downloading %s email template', emailId);
    var options = {
      api: util.format('/email/types/%s/templates', emailId),
      method: 'get',
      body: true,
      download: tempFile,
      qs: {
        occsite: settings.siteId
      }
    };
    self._occ.request(options, function(error, body) {
      if (error || (body && body.status == 404)) {
        callback(error || 'Email not foun on OCC');
      }
      callback();
    });
  };

  /**
   * Unzip files on emails project folder.
   */

  var unzipFiles = function(callback) {
    winston.info('Unzipping the email');
    extract(
      tempFile,
      { dir: path.join(_config.dir.project_root, 'emails', emailId) },
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
