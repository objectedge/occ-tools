'use strict';

var winston = require('winston');
var util = require('util');

module.exports = function(filterId, settings, callback) {
  var self = this;

  winston.info('Deleting the response filter on OCC');

  var options = {
    api: util.format('/responseFilters/%s', filterId),
    method: 'delete'
  };

  self._occ.request(options, function(error, response) {
    if (error) {
      callback(error);
    }

    if (response.errorCode) {
      winston.error('[%s] %s', response.errorCode, response.message);
      callback('Error deleting the response filter');
    }

    callback();
  });
};
