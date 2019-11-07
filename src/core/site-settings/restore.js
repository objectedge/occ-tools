'use strict';

var winston = require('winston');
var async = require('async');
var util = require('util');

/**
 * Restores the site settings or payment gateway previous configuration.
 *
 * @param {string} settingsId The widget type
 * @param {string} settingsType The settings type (config or gateway)
 * @param {object} backup The backup information
 * @param {request} occ The OCC requester
 * @param {function} callback The callback function
*/
var restoreSettings = function (settingsId, settingsType, backup, occ, callback) {
  if (backup.data && Object.keys(backup.data).length) {
    async.waterfall([
      // retrieve the new site settings, to get the new schema
      function (wcb) {
        occ.request(util.format('/sitesettings/%s', settingsId), function (error, response) {
          if (error || !response.data) {
            winston.error('Could not restore the previous configuration');
            winston.info(backup);
            wcb(error || response.message);
          }
          wcb(null, response);
        });
      },
      function (siteSettings, wcb) {
        // update the settings for each site
        async.each(
          backup.sites,
          function (site, cb) {
            // add new properties to the backup object
            siteSettings.config.values.forEach(function (config) {
              if (config.required) {
                if (settingsType === 'config' && !backup.data[site].hasOwnProperty(config.name)) {
                  backup.data[site][config.name] = config.defaultValue;
                } else if (settingsType === 'gateway') {
                  // payment gateways have multiple instances
                  // like: preview, store, agent
                  Object.keys(backup.data[site]).forEach(function (key) {
                    var instance = backup.data[site][key];
                    if (instance !== null && typeof instance === 'object' &&
                      !instance.hasOwnProperty(config.name)) {
                      instance[config.name] = config.defaultValue;
                    }
                  });
                }
              }
            });

            winston.info(
              'Restoring the previous site settings configuration for site %s',
              site
            );
            winston.info(backup.data[site]);

            var options = {
              api: util.format('/sitesettings/%s', settingsId),
              method: 'put',
              body: backup.data[site],
              headers: {
                'x-ccsite': site
              }
            };
            occ.request(options, function (error, response) {
              if (error || response.errorCode) {
                winston.error('Could not restore the previous configuration');
                winston.info(backup);
                cb(error || response.message);
              }
              cb();
            });
          },
          function (error) {
            if (error) wcb(error);
            wcb();
          }
        );
      }
    ], callback);
  } else {
    callback();
  }
};

/**
 * Restores if the payment gateway was enabled.
 *
 * @param {string} settingsId The widget type
 * @param {string} settingsType The settings type (config or gateway)
 * @param {object} backup The backup information
 * @param {request} occ The OCC requester
 * @param {function} callback The callback function
*/
var restoreGateway = function (settingsId, settingsType, backup, occ, callback) {
  if (settingsType === 'gateway' && backup.settings && Object.keys(backup.settings).length) {
    // restore the information for each site
    async.each(
      backup.sites,
      function (site, cb) {
        // if the gateway was not enabled before, we can skip
        // the process, since the default options is false
        if (!backup.settings[site].enabled) return cb();
        async.waterfall([
          // each site has an instance ID for the payment gateway
          // that changes when the extension is upgraded
          // so, first we get the instance id for the given site
          function (wcb) {
            var merchantOptions = {
              api: '/merchant/paymentGateways',
              method: 'get',
              headers: {
                'x-ccsite': site
              }
            };
            occ.request(merchantOptions, function (error, response) {
              if (error || response.errorCode) wcb(error || response.message);
              // the method returns all payment gateways,
              // so this finds the payment gateway to be updated
              var paymentGateway = response.paymentGateways.find(function (gateway) {
                return gateway.settingsConfigId === settingsId;
              });
              if (!paymentGateway) return wcb('Payment gateway not found for site ' + site);
              wcb(null, paymentGateway.repositoryId);
            });
          },
          // update the payment gateway settings
          function (repositoryId, wcb) {
            var options = {
              api: '/merchant/paymentGateways',
              method: 'put',
              body: {
                paymentGateway: {
                  enabled: true
                },
                gatewayName: repositoryId
              },
              headers: {
                'x-ccsite': site
              }
            };
            winston.info('Restoring the previous payment gateway configuration for site %s', site);
            occ.request(options, function (error, response) {
              if (error || response.errorCode) wcb(error || response.message);
              wcb();
            });
          }
        ], cb);
      },
      function (error) {
        if (error) callback(error);
        callback();
      });
  } else {
    callback();
  }
};

/**
 * Restores a site settings or gateway backup
 *
 * @param {string} settingsId The widget type
 * @param {string} settingsType The settings type (config or gateway)
 * @param {object} backup The backup information
 * @param {request} occ The OCC requester
 * @param {function} callback The callback function
 */
module.exports = function (settingsId, settingsType, backup, occ, callback) {
  async.waterfall([
    async.apply(restoreSettings, settingsId, settingsType, backup, occ),
    async.apply(restoreGateway, settingsId, settingsType, backup, occ)
  ], callback);
};
