'use strict';

var path = require('path');
var winston = require('winston');
const cTable = require('console.table');
var fs = require('fs-extra');
var _config = require('../config');
var async = require('async');
var util = require('util');

/**
 * Checking if the siteId was set in the command and has a valid value.
 * @param  {Object} settings The options
 * @param  {Object} data The email data
 * @param  {Array} callback The callback function
 */
function checkSiteId(settings, sites, callback) {
  //In case 'sites' comes as empty or null
  if(!sites || !sites.length) {
    callback('No sites have been found');
  }else{
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

/**
 * List all sites
 *
 * @param {Object} occ The OCC requester
 * @param {Function} callback The callback function
 */
function getSites(occ, callback) {
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
}

function getFilterFunction(settings, filterFunction) {
  var filterFunction;

  if (settings.enabled) {
    filterFunction = function(item) {
      return item.enabled === 'Yes';
    };
  } else {
    filterFunction = function(item) {
      return true;
    };
  }
  return filterFunction;
}

function sortAlphabetically(item1, item2) {
  if (item1['id'] < item2['id']) {
    return -1;
  } else if (item1['id'] > item2['id']) {
    return 1;
  } else {
    return 0;
  }
}

function isDownloaded(key) {
  try {
    fs.lstatSync(path.join(_config.dir.project_root, 'emails', key));
    return true;
  } catch (e) {
    return false;
  }
}

function toYesOrNo(value) {
  if (value) {
    return 'Yes';
  }
  return 'No';
}

module.exports = function(settings, callback) {
  winston.info('Listing emails');

  var self = this;

  async.waterfall(
    [
      function(callback) {
        //Calling function to request the current site list
        getSites(self._occ, callback);
      },

      function(sites, callback) {

        //Checking if the siteId was set in the command and has a valid value
        if(settings.siteId) {
          checkSiteId(settings, sites, callback);
        }

        var options = {
          api: '/email/notificationTypes',
          method: 'get',
          headers: {
            'x-ccsite': settings.siteId || '' //should check the correspondent site or the default, if no siteId is set
          }
        };

        var emails = [];
        self._occ.request(options, function(error, response) {
          if (error) {
            callback('Error while listing the email');
          }

          if (response.errorCode || response.error || parseInt(response.status) >= 400) {
            callback(response.message);
          }

          Object.keys(response).forEach(function(key) {
            var email = response[key];
            if (key !== 'links') {
              emails.push({
                id: key,
                name: email.displayName,
                enabled: toYesOrNo(email.enabled),
                downloaded: toYesOrNo(isDownloaded(key))
              });
            }
          });

          console.table(
            emails.filter(getFilterFunction(settings)).sort(sortAlphabetically)
          );
          callback();
        });
      }
    ],
    callback
  );
};
