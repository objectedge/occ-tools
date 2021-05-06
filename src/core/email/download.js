'use strict';

var fs = require('fs-extra');
var os = require('os');
var path = require('path');
var util = require('util');
var async = require('async');
var winston = require('winston');
var extract = require('extract-zip');
var _config = require('../config');

var PARALLEL_DOWNLOADS = 8;

module.exports = function(emailId, settings, callback) {
  var self = this;

  var getEmailInfo = function (callback) {
    self._occ.request('email', function (error, emailsInfo) {
      if (error || (emailsInfo.status && parseInt(emailsInfo.status) >= 400)) {
        callback(error || emailsInfo.message);
      }

      var allEmails = Object.keys(emailsInfo.emailNotificationTypes).map(
        (key) => emailsInfo.emailNotificationTypes[key]
      );

      var targetEmails = allEmails.filter((email) => email.enabled);
      if (emailId) {
        targetEmails = targetEmails.filter((email) => email.id == emailId);
      }

      callback(null, targetEmails);
    });
  };

  /**
   * Downloads email template from OCC.
   */
  var downloadFromOCC = function (emails, callback) {
    // download the files in parallel
    async.eachLimit(
      emails,
      PARALLEL_DOWNLOADS,
      function (email, cb) {
        var tempFile = path.join(os.tmpdir(), util.format('email-%s-%s.zip', email.id, new Date().getTime()));
        async.waterfall(
          [
            downloadOneFromOCC.bind(self, email, tempFile),
            unzipFiles.bind(self, email, tempFile),
            clearTemporaryFile.bind(self, email, tempFile),
          ],
          cb
        );
      },
      callback
    );
  };


  var downloadOneFromOCC = function (email, tempFile, callback) {
    winston.info('Downloading %s email template', email.id);
    var options = {
      api: util.format('/email/types/%s/templates', email.id),
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
   var unzipFiles = function (email, tempFile, callback) {
    winston.info('Unzipping the email %s', email.id);
    extract(tempFile, { dir: path.join(_config.dir.project_root, 'emails', email.id) }, function (err) {
      if (err) {
        callback('Error extracting the file: ' + err);
      }
      callback();
    });
  };

  /**
   * Removes local temporary file.
   */
  var clearTemporaryFile = function (email, tempFile, callback) {
    winston.info('Removing temporary files for email %s', email.id);
    fs.unlink(tempFile, callback);
  };

  async.waterfall([getEmailInfo, downloadFromOCC], callback);
};
