'use strict';

var winston = require('winston');
var async = require('async');

/**
 * Get the application information
 * 
 * @param {string} extensionName The extension name
 * @param {request} occ The OCC requester
 * @param {function} callback The callback function
 */
var getApplication = function (extensionName, occ, callback) {
  winston.info('Retrieving application information');
  occ.request('/applicationIds?type=extension', function (error, response) {
    if (error || response.errorCode) callback(error || response.message);

    var application = response.items.find(function (application) {
      return application.name === extensionName;
    });

    if (application) {
      winston.info('Found application %s', application.repositoryId);
      callback(null, application);
    } else {
      winston.warn('No application found for widget %s', extensionName);
      callback(null, null);
    }
  });
};

/**
 * Get the extension information
 * 
 * @param {string} extensionName The extension name
 * @param {request} occ The OCC requester
 * @param {object} application The application information
 * @param {function} callback The callback function
 */
var getExtension = function (extensionName, occ, application, callback) {
  if (application && application.inUse) {
    winston.info('Retrieving extension information');
    occ.request('/extensions', function (error, response) {
      if (error || response.errorCode) callback(error || response.message);

      var extension = response.items.find(function (extension) {
        return extension.repositoryId === application.repositoryId;
      });

      if (extension) {
        callback(null, application, extension);
      } else {
        winston.warn('No extension found for widget %s', application.repositoryId);
        callback(null, application, null);
      }
    });
  } else {
    callback(null, application, null);
  }
};

/**
 * Get application and extension information
 * 
 * @param {string} extensionName The extension name
 * @param {request} occ The OCC requester
 * @param {function} callback The callback function, 
 * will return application and extension as parameter
 */
module.exports = function (extensionName, occ, callback) {
  async.waterfall([
    async.apply(getApplication, extensionName, occ),
    async.apply(getExtension, extensionName, occ)
  ], callback);
};