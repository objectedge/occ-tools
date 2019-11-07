'use strict';

var winston = require('winston');
var async = require('async');

/**
 * Deactivate the extension if it is enabled
 * 
 * @param {object} application The extension information
 * @param {object} extension The extension information
 * @param {request} occ The OCC requester
 * @param {function} callback The callback function, 
*/
var deactivateExtension = function (extension, occ, callback) {
  if (extension && extension.enabled) {
    winston.info('Deactivating extension');
    var deactivateOptions = {
      'api': '/extensions/' + extension.repositoryId,
      'method': 'post',
      'body': { 'op': 'deactivate' }
    };
    occ.request(deactivateOptions, function (error, response) {
      if (error){
        callback(error);
      } 
      if (!response.success) {
        winston.error(response.message);
        callback('Error deactivating the extension');
      }
      winston.info('Extension was deactivated');
      callback();
    });
  } else {
    callback();
  }
};

/**
 * Deletes the extension if it is installed
 * 
 * @param {object} application The extension information
 * @param {object} extension The extension information
 * @param {request} occ The OCC requester
 * @param {function} callback The callback function, 
 */
var deleteExtension = function (extension, occ, callback) {
  if (extension) {
    winston.info('Deleting extesion');
    var deleteOptions = {
      'api': '/extensions/' + extension.repositoryId,
      'method': 'delete',
      'body': true
    };
    occ.request(deleteOptions, function (error, response) {
      if (error) callback(error);
      winston.info('Extension was deleted');
      callback();
    });
  } else {
    callback();
  }
};

/**
 * Deactivates and deletes an extension
 *
 * @param {request} occ The OCC requester
 * @param {object} application The extension information
 * @param {object} extension The extension information
 * @param {function} callback The callback function, 
 * will return application and extension as parameter
 */
module.exports = function (extension, occ, callback) {
  async.waterfall([
    async.apply(deactivateExtension, extension, occ),
    async.apply(deleteExtension, extension, occ)
  ], callback);
};
