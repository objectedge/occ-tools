'use strict';

var winston = require('winston');
const cTable = require('console.table');

module.exports = function (settings, callback) {
  winston.info('Listing app-levels');

  var options = {
    api: '/applicationJavaScript',
    method: 'get'
  };

  this._occ.request(options, function (error, response) {
    if (error) {
      callback('Error while listing the app-levels');
    }

    if (response.errorCode || response.error || parseInt(response.status) >= 400) {
      callback(response.message);
    }

    var appLevels = Object.keys(response.items).map(function (key) {
      var appLevel = response.items[key];
      return {
        ID: key,
        Sites: appLevel.sites.length ? appLevel.sites.join(', ') : 'All',
      };
    });

    console.table(appLevels);
    callback();
  });
};
