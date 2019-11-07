'use strict';

var util = require('util');
var winston = require('winston');
var async = require('async');

/**
 * Gets app-level information
 * 
 * @param {String} id The app-level ID
 * @param {Object} occ The OCC requester
 * @param {Function} callback The callback function 
 */
var getAppLevel = function (id, occ, callback) {
  winston.info('Retrieving app-level configuration');
  var backup = {};
  occ.request('/applicationJavaScript', function (error, response) {
    if (error) callback(error);

    var appLevelId = util.format('%s.js', id);
    if (response.items.hasOwnProperty(appLevelId)) {
      backup.data = response.items[appLevelId];
    } else {
      winston.warn('The app-level %s is not installed', id);
    }

    callback(null, backup);
  });
};

/**
 * Get app-level information
 * 
 * @param {String} appLevelId The app-level ID
 * @param {Object} occ The OCC requester
 * @param {Function} callback The callback function, 
 */
module.exports = function (appLevelId, occ, callback) {
  async.waterfall([
    async.apply(getAppLevel, appLevelId, occ)
  ], callback);
};