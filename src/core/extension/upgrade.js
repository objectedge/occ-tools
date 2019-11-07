var fs = require('fs-extra');
var os = require('os');
var path = require('path');
var util = require('util');
var winston = require('winston');
var async = require('async');

var _config = require('../config');
var Widget = require('../widget');

var generateExtension = require('./generate');
var getExtension = require('./get');
var createExtension = require('./create');
var deleteExtension = require('./delete');
var backupWidget = require('../widget/backup');
var restoreWidget = require('../widget/restore');
var backupSettings = require('../site-settings/backup');
var restoreSettings = require('../site-settings/restore');
var uploadFile = require('../files/upload');
var backupAppLevel = require('../app-level/backup');
var restoreAppLevel = require('../app-level/restore');

/**
 * Backups, sends a new version, and restores the extension
 *
 * @param {String} extensionName the extension name
 * @param {Object} opts the command options
 * @param {Function} callback the callback function
 */
module.exports = function (extensionName, opts, callback) {
  var self = this;

  // stores the backup information to be restored
  var backup = {};

  // the extension type, can be (app-level, config, gateway or widget)
  var extensionType = opts.type;
  if (extensionType === 'appLevel'){
    extensionType = 'app-level';
  }
  // the path where the item is
  var extensionPath,
    // the zip file that will be geneated
    extensionZipFile;

  // initializes extension path and zip based on the extension type
  switch (extensionType) {
    case 'app-level':
      extensionPath = path.join(_config.dir.project_root, 'app-level');
      extensionZipFile = path.join(extensionPath, extensionName, extensionName + '.zip');
      break;
    case 'config':
      extensionPath = path.join(_config.dir.project_root, 'settings', 'config');
      extensionZipFile = path.join(extensionPath, extensionName + '.zip');
      break;
    case 'gateway':
      extensionPath = path.join(_config.dir.project_root, 'settings', 'gateway');
      extensionZipFile = path.join(extensionPath, extensionName + '.zip');
      break;
    default:
      extensionPath = path.join(_config.dir.project_root, 'widgets', 'objectedge');
      extensionZipFile = path.join(extensionPath, extensionName, extensionName + '.zip');
  }

  /**
  * Checks if the extension path exists locally
  *
  * @param {Function} callback the callback function
  */
  var checkPath = function (callback) {
    winston.info('Checking path consistency');
    var directory = path.join(extensionPath, extensionName);
    fs.lstat(directory, function (error, stats) {
      if (error) {
        winston.error('The %s does not exist locally', extensionType);
        callback('Path not found');
      } else {
        callback();
      }
    });
  };

  /**
  * Stores the backup on the backup variable
  *
  * @param {Function} callback the callback function
  * @param {String} error The error if it's present
  * @param {Object} information the backup information
  */
  var storeBackup = function (callback, error, information) {
    if (error) callback(error);
    backup = information;
    var file = util.format(
      '%s-%s-%d.json',
      extensionType,
      extensionName,
      new Date().getTime()
    );
    var tempFile = path.join(os.tmpdir(), file);
    winston.info('Storing backup on file %s', tempFile);
    fs.outputFile(tempFile, JSON.stringify(backup, null, 2), function () {
      callback();
    });
  };

  async.waterfall([
    // check the extension path locally
    checkPath,
    // backup the extension information
    function (callback) {
      if (extensionType === 'widget') {
        backupWidget(extensionName, self._occ, storeBackup.bind(this, callback));
      } else if (extensionType === 'config' || extensionType === 'gateway') {
        backupSettings(extensionName, extensionType, self._occ, storeBackup.bind(this, callback));
      } else if (extensionType === 'app-level') {
        backupAppLevel(extensionName, self._occ, storeBackup.bind(this, callback));
      } else {
        callback();
      }
    },
    // get the extension informatio from OCC
    async.apply(getExtension, extensionName, self._occ),
    // deactivate and delete the extension
    function (application, extension, callback) {
      deleteExtension(extension, self._occ, function (error) {
        if (error) callback(error);
        callback(null, application);
      });
    },
    // create the extension, if necessary
    function (application, callback) {
      if (!application) {
        createExtension(extensionName, self._occ, callback);
      } else {
        callback(null, application.repositoryId);
      }
    },
    // generate a extension zip file
    function (extensionId, callback) {
      var options = {
        'extensionId': extensionId,
        'dir': extensionPath,
        'widgets': extensionName,
        'name': extensionName,
        'isAppLevel': extensionType === 'app-level' ? true : false,
        'isConfig': extensionType === 'config' ? true : false,
        'isGateway': extensionType === 'gateway' ? true : false,
        'datetime': opts.datetime
      };
      generateExtension(options, function (error) {
        if (error) callback(error);
        callback(null, extensionId);
      });
    },
    // upload the extension file to OCC
    function (extensionId, callback) {
      var destinationName = new Date().getTime() + '_' + extensionName + '.zip';
      uploadFile.call(
        self,
        extensionZipFile,
        '/extensions/' + destinationName,
        function (error) {
          if (error) callback(error);
          callback(null, extensionId, destinationName);
        }
      );
    },
    // finish the extension upload to OCC
    function (extensionId, extensionName, callback) {
      var options = {
        'api': '/extensions',
        'method': 'post',
        'body': { 'name': extensionName }
      };
      self._occ.request(options, function (error, response) {
        if (error || !response.success) {
          if (response.errors) {
            response.errors.forEach(function (error) {
              winston.error(error);
            });
          }
          callback(error || 'Error uploading the extension');
        }
        if (response.warnings) {
          response.warnings.forEach(function (warning) {
            winston.warn(warning);
          });
        }
        winston.info('Extension was uploaded');
        callback(null);
      });
    },
    // restore the extension information
    function (callback) {
      if (extensionType === 'widget') {
        restoreWidget(extensionName, backup, self._occ, callback);
      } else if (extensionType === 'config' || extensionType === 'gateway') {
        restoreSettings(extensionName, extensionType, backup, self._occ, callback);
      } else if (extensionType === 'app-level') {
        restoreAppLevel(extensionName, backup, self._occ, callback);
      } else {
        callback();
      }
    },
    function (callback) {
      // Specifically for widget upgrade, we have to upload less file
      // when restore is complete
      // Uploading template to add version info (commit hash and uploaded date)
      if (extensionType === 'widget') {
        var widget = new Widget();

        widget.on('complete', function(msg) {
          winston.info(msg);
          return callback();
        });
        widget.on('error', function(err) {
          winston.error(err);
          return callback();
        });
        widget.upload(extensionName, { files: ['less', 'template'] });
      } else {
        // Nothing to do. Proceed with the waterfall
        callback();
      }
    }
  ], callback);
};
