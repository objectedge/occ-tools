'use strict';

var winston = require('winston');
var async = require('async');
var util = require('util');

/**
 * Restores an app-level configuration
 * 
 * @param {String} id The app-level ID
 * @param {Object} backup The backup information
 * @param {Object} occ The OCC requester
 * @param {Function} callback The callback function
*/
var restoreAppLevel = function (id, backup, occ, callback) {
  if (backup.data && Object.keys(backup.data).length) {
    // update the app-level sites associations
    var options = {
      api: util.format('/applicationJavaScript/%s/%s', util.format('%s.js', id), 'updateSiteAssociations'),
      method: 'post',
      body: backup.data
    };
    winston.info('Restoring the previous app-level site associations');
    occ.request(options, function (error, response) {
      if (error || response.errorCode) callback(error || response.message);
      callback();
    });
  } else {
    callback();
  }
};

/**
 * Restores an app-level from backup
 * 
 * @param {String} id the app-level ID
 * @param {Object} backup The backup information
 * @param {Object} occ The OCC requester
 * @param {Function} callback The callback function
 */
module.exports = function (id, backup, occ, callback) {
  async.waterfall([
    async.apply(restoreAppLevel, id, backup, occ)
  ], callback);
};