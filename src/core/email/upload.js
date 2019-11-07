'use strict';

var fs = require('fs-extra');
var os = require('os');
var path = require('path');
var async = require('async');
var winston = require('winston');
var archiver = require('archiver');
var util = require('util');
var ncp = require('ncp');
var _bundle = require('./bundle');

var _config = require('../config');
var uploadFile = require('../files/upload');

module.exports = function(emailId, settings, callback) {
  var self = this;
  var timeStamp = new Date().getTime();
  // temporary zip file to be uploaded
  var tempFile = path.join(os.tmpdir(), util.format('%s-%s.zip', emailId,timeStamp));

  // temporary folder
  var tempFolder = path.join(os.tmpdir(), util.format('%s-%s', emailId,timeStamp));

  // source path
  var sourceDir = path.join(_config.dir.project_root, 'emails', emailId);

  /**
   * Checks if the resource folder exists locally.
   */
  var checkEmailPath = function(callback) {
    winston.info('Checking files consistency');
    fs.lstat(sourceDir, (err, stats) => {
      if (err) callback('Email template does not exist locally.');
      callback();
    });
  };

  /**
   * Bundle template file.
   */
  var bundleTemplate = function(callback){
    var templatePath = path.join(tempFolder, 'html_body.ftl');
    fs.readFile(
      templatePath, 'utf8',
      function(err, data) {
        if (err) {
          winston.debug(err);
          callback('Error reading email template file html_body.ftl');
        }

        _bundle(data, function(data){
          fs.outputFile(templatePath, data, {}, callback);
        });
      }
    );
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
    archive.glob(path.join('**', '*'), {
      cwd: tempFolder,
      ignore: ['*.html']
    });
    archive.finalize();
  };

  /**
   * Uploads the resource to OCC.
   */
  var upgradeTemplate = function(callback) {
    winston.info('Uploading %s email template', emailId);

    var options = {
      api: util.format('/email/types/%s/templates', emailId),
      method: 'put',
      body: {
        filename: util.format('/notifications/uploads/%s', tempFile)
      },
      headers: {
        'x-ccsite': settings.siteId,
        'x-ccasset-language': settings.languageId
      }
    };
    self._occ.request(options, function(error, body) {
      if (error || body.errorCode) {
        winston.error(error || body.message);
        callback('Error uploading the email template');
      }

      if (body.warnings && body.warnings.length) {
        body.warnings.forEach(function(warning) {
          winston.warn(warning);
        });
      }

      if (body.errors && body.errors.length) {
        body.errors.forEach(function(error) {
          winston.error(error);
        });
        callback('Error uploading the email template');
      }

      callback();
    });
  };

  // upload the extension file to OCC
  var uploadFileToOCC = function(callback) {
    uploadFile.call(
      self,
      tempFile,
      util.format('/notifications/uploads/%s',tempFile),
      function(error) {
        if (error) callback(error);
        callback();
      }
    );
  };

  /**
   * Removes local temporary file.
   */
  var clearTemporaryFile = function(callback) {
    winston.info('Removing temporary files');
    async.waterfall(
      [
        fs.unlink.bind(null, tempFile),
        fs.remove.bind(null, tempFolder)
      ],
      callback
    );
  };

  async.waterfall(
    [
      checkEmailPath,
      ncp.bind(null, sourceDir, tempFolder),
      bundleTemplate,
      zipFiles,
      uploadFileToOCC,
      upgradeTemplate,
      clearTemporaryFile
    ],
    callback
  );
};
