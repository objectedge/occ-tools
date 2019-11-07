'use strict';

var fs = require('fs-extra');
var path = require('path');
var async = require('async');
var winston = require('winston');
var _config = require('../config');
var util = require('util');

module.exports = function(filterId, settings, callback) {
  var self = this;
  self.filtersFile = path.join(_config.dir.project_root, 'responseFilters.json');
  self.localItems = [];
  self.remoteItems = [];

  var readLocalItems = function(callback) {
    fs.readFile(self.filtersFile, 'utf8', function(error, filters) {
      if (error) {
        callback(error);
      }

      self.localItems = JSON.parse(filters);
      callback();
    });
  };

  var getFiltersFromOCC = function(callback) {
    self._occ.request(util.format('/responseFilters'), function(error, response){
      if (error) {
        callback(error);
      }

      if (response.errorCode) {
        winston.error('[%s] %s', response.errorCode, response.message);
        callback('Error listing the response filters from OCC');
      }

      self.remoteItems = response.items;
      callback();
    });
  };


  var uploadFilter = function(filter, callback) {
    var options = {
      body: filter
    };

    var remoteItem = self.remoteItems.find(function(item){
      return item.key === filter.key;
    });

    if (!remoteItem) {
      winston.info('Creating the %s response filter on OCC', filter.key);
      options.api = '/responseFilters';
      options.method = 'post';
    } else {
      winston.info('Updating the %s response filter on OCC', filter.key);
      options.api = util.format('/responseFilters/%s', filter.key);
      options.method = 'put';
    }

    self._occ.request(options, function(error, response) {
      if (error) {
        callback(error);
      }

      if (response.errorCode) {
        winston.error('[%s] %s', response.errorCode, response.message);
        callback('Error uploading the response filter');
      }

      callback();
    });
  };

  var uploadFilters = function(callback) {
    if (filterId) {
      var filter = self.localItems.find(function(element) {
        return element.key === filterId;
      });

      if (filter){
        uploadFilter(filter, callback);
      } else {
        callback('No filter with name ' + filter + ' on responseFilters.json.');
      }
    } else {
      async.each(self.localItems, uploadFilter, callback);
    }
  };

  var checkForMissingFilters = function(callback) {
    var localItems = self.localItems.map(function(item) { return item.key; });
    var missingItems = self.remoteItems.filter(function(item) {
      return !localItems.includes(item.key);
    }).map(function(item){ return item.key; });

    if (missingItems && missingItems.length) {
      winston.warn('The following filters items are missing locally: \n%s', missingItems.join('\n'));
      winston.warn('You can use download command to keep your local repository up-to-date');
    }
    callback();
  };

  if (filterId){
    winston.info('Uploading %s response filter to OCC', filterId);
  } else {
    winston.info('Uploading all response filters to OCC');
  }

  async.waterfall(
    [
      readLocalItems,
      getFiltersFromOCC,
      uploadFilters,
      checkForMissingFilters
    ],
    callback
  );
};
