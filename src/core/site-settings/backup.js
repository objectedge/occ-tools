'use strict';

var winston = require('winston');
var async = require('async');
var util = require('util');

/**
 * List all sites
 *
 * @param {Object} occ The OCC requester
 * @param {Function} callback The callback function
 */
var getSites = function (occ, callback) {
  var backup = {};
  winston.info('Listing sites from OCC');
  var options = {
    api: '/sites',
    method: 'get',
    qs: {
      production: true
    }
  };
  occ.request(options, function (error, response) {
    if (error) callback(error);

    backup.sites = response.items.map(function (site) {
      return site.repositoryId;
    });

    callback(null, backup);
  });
};

/**
 * Gets the site settings information for site settings and payment gateways
 *
 * @param {String} settingsId The site settings ID
 * @param {String} settingsType The settings type (config or gateway)
 * @param {Object} occ The OCC requester
 * @param {Object} backup the backup data
 * @param {Function} callback The callback function
 */
var getSiteSettings = function (id, type, occ, backup, callback) {
  winston.info('Retrieving site settings current configuration');
  backup.data = {};
  async.each(
    backup.sites,
    function (site, cb) {
      var options = {
        api: util.format('/sitesettings/%s', id),
        method: 'get',
        headers: {
          'x-ccsite': site
        }
      };
      occ.request(options, function (error, response) {

        // When error code is 33068 it means that the settings does not exist on OCC
        // it could be the first time the user is installing it, so we accept it
        if (error && (!error.errorCode || error.errorCode != '33068')) {
          cb(error.message || error);
        } else {
          if (response && response.data) {
            backup.data[site] = response.data;
            if (type === 'gateway') {
              delete backup.data[site].shownInStore;
              delete backup.data[site].enabled;
            }
          } else {
            winston.info('This extension is not installed on site %s.', site);
          }
          cb();
        }
      });
    },
    function (error) {
      if (error) callback(error);
      callback(null, backup);
    }
  );

};

/**
 * Gets additional payment gateway information
 *
 * @param {String} settingsId The site settings ID
 * @param {String} settingsType The settings type (config or gateway)
 * @param {Object} occ The OCC requester
 * @param {Object} backup The settings information
 * @param {Function} callback The callback function
 */
var getPaymentGatewayInformation = function (id, type, occ, backup, callback) {
  if (type === 'gateway') {
    winston.info('Retrieving payment gateway current configuration');
    backup.settings = {};
    async.each(
      backup.sites,
      function (site, cb) {
        var options = {
          api: '/merchant/paymentGateways',
          method: 'get',
          headers: {
            'x-ccsite': site
          }
        };
        occ.request(options, function (error, response) {
          if (error || response.errorCode) cb(error || response.message);
          response.paymentGateways.forEach(function (gateway) {
            if (gateway.settingsConfigId === id) {
              backup.settings[site] = gateway;
            }
          });
          cb(null, backup);
        });
      },
      function (error) {
        if (error) callback(error);
        callback(null, backup);
      }
    );
  } else {
    callback(null, backup);
  }
};

/**
 * Get all site settings or payment gateway information as backup
 *
 * @param {String} settingsId The settings ID
 * @param {String} settingsType The settings type (config or gateway)
 * @param {Object} occ The OCC requester
 * @param {Function} callback The callback function,
 * will return settingsInformation as parameter
 */
module.exports = function (settingsId, settingsType, occ, callback) {
  async.waterfall([
    async.apply(getSites, occ),
    async.apply(getSiteSettings, settingsId, settingsType, occ),
    async.apply(getPaymentGatewayInformation, settingsId, settingsType, occ)
  ], callback);
};
