var fs = require('fs-extra');
var async = require('async');
var winston = require('winston');

var restoreWidget = require('../widget/restore');
var restoreSettings = require('../site-settings/restore');
var restoreAppLevel = require('../app-level/restore');

/**
 * Restore a extension from a file
 * 
 * @param {String} extensionName the extension name
 * @param {Object} opts the command options
 * @param {Function} callback the callback function
 */
module.exports = function (extensionName, file, opts, callback) {
  var self = this;

  // the extension type, can be (app-level, config, gateway or widget)
  var extensionType = opts.type;
  
  async.waterfall([
    // read the backup file
    function (callback) {
      winston.info('Reading backup file...');
      fs.readFile(file, 'utf8', function (error, data) {
        if (error) callback(error);
        callback(null, JSON.parse(data));
      });
    },
    // restore the extension information
    function (backup, callback) {
      winston.info('Restoring backup file...');
      if (extensionType === 'widget') {
        restoreWidget(extensionName, backup, self._occ, callback);
      } else if (extensionType === 'config' || extensionType === 'gateway') {
        restoreSettings(extensionName, extensionType, backup, self._occ, callback);
      } else if (extensionType === 'app-level') {
        restoreAppLevel(extensionName, backup, self._occ, callback);
      } else {
        callback();
      }
    }
  ], callback);
};
