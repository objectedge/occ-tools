'use strict';

var async = require('async');
var winston = require('winston');
var fs = require('fs-extra');
var path = require('path');
var util = require('util');

var _config = require('../config');

/**
 * Checking if the siteId was set in the command and has a valid value.
 * @param  {Object} settings The options
 * @param  {Object} data The email data
 * @param  {Array} callback The callback function
 */
function checkSiteId(settings, sites, callback) {
  //In case 'sites' comes as empty or null
  if (!sites || !sites.length) {
    callback('No sites have been found');
  } else {
    //Verifying if the siteId refers to one of the configured sites
    const selectedSiteId = sites.filter(id => id === settings.siteId);
    if(selectedSiteId.length <= 0) {
      let message = util.format('Invalid siteId: %s \n\n', settings.siteId);
      message += 'Available options:\n';
      message += sites.sort().join('\n');
      callback(message, settings.siteId);
    }
  }
}

function checkIfEnabled(email, emailId, callback) {
  if (email.enabled) {
    return true;
  } else {
    return callback(util.format('The email %s is disabled on OCC.', emailId));
  }
}

module.exports = function(emailId, settings, callback) {
  var self = this;

  /**
   * List all sites
   *
   * @param {Object} occ The OCC requester
   * @param {Function} callback The callback function
   */
  var getSites = function(occ, callback) {
    var sites = [];
    winston.info('Checking sites from OCC');
    var options = {
      api: '/sites',
      method: 'get',
      qs: {
        production: true
      }
    };
    occ.request(options, function (error, response) {
      if (error) callback(error);

      sites = response.items.map(function (site) {
        return site.repositoryId;
      });

      callback(null, sites);
    });
  };

  /**
   * Get the search status until the search is not finished.
   * @param  {String} emailId The email id
   * @param  {Object} settings The options
   * @param  {Object} data The email data
   * @param  {Array} callback The callback function
   */
  var triggerEmail = function(emailId, settings, data, callback) {

    data.messageDetails = {
      notificationType: emailId,
      locale: settings.locale,
      toEmail: settings.mailTo,
      fromSite: settings.siteId
    };

    var options = {
      api: '/emailNotifications',
      method: 'post',
      body: data,
      headers: {
        'x-ccsite': settings.siteId || '' //should check the correspondent site or the default, if no siteId is set
      }
    };
    self._occ.request(options, function(error) {
      if (error) {
        callback(util.format('Error triggering email %s', error));
      }
      callback();
    });
  };

  async.waterfall(
    [
      function(callback) {
        //Calling function to request the current site list
        getSites(self._occ, callback);
      },
      /**
       * Trigger the an email on OCC.
       * @param  {Object} callback The callback
       */
      function(sites, callback) {
        winston.info('Searching email %s', emailId);

        //Checking if the siteId was set in the command and has a valid value
        if (settings.siteId) checkSiteId(settings, sites, callback);

        var options = {
          api: '/email/notificationTypes',
          method: 'get',
          headers: { 'x-ccsite': settings.siteId || '' } //should check the correspondent site or the default, if no siteId is set
        };
        self._occ.request(options, function(error, response) {
          if (error) callback('Error while searching the email');
          var found = false;
          var emails = [];
          Object.keys(response).forEach(function(key) {
            var email = response[key];

            if (key != 'links') {
              emails.push(key + ' (' + (email.enabled ? 'enabled' : 'disabled') + ')');
            }

            if (key === emailId) found = checkIfEnabled(email, emailId, callback);
          });

          if (!found) {
            var message = util.format('The email %s does not exist on OCC. ', emailId);
            message += 'Available options:\n';
            message += emails.sort().join('\n');
            callback(message, emailId);
          } else {
            winston.info('Reading email data');
            fs.readFile(
              path.join(
                _config.dir.project_root,
                'emails',
                'samples',
                settings.data
              ),
              'utf8',
              function(error, data) {
                if (error) callback(error);
                try {
                  triggerEmail(emailId, settings, JSON.parse(data), callback);
                } catch (e) {
                  callback(e);
                }
              }
            );
          }
        });
      }
    ],
    callback
  );
};
