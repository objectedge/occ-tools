'use strict';

var fs = require('fs-extra');
var path = require('path');
var winston = require('winston');
var async = require('async');
var _configs = require('../config');

/**
 * Download response filters from OCC
 *
 * @param {Object} settings command options
 * @param {Function} callback the callback function
 */
module.exports = function(settings, callback) {
  var self = this;
  self.filtersFile = path.join(_configs.dir.project_root, 'responseFilters.json');
  self.merge = settings.merge;
  self.data = [];
  winston.info('Dowloading response filters from OCC');

  var getFilters = function(callback) {
    self._occ.request('/responseFilters', function(error, response) {
      if (error) {
        callback(error);
      }

      if (response.errorCode) {
        winston.error('[%s] %s', response.errorCode, response.message);
        callback('Error downloading the response filters');
      }

      self.data = response.items;
      callback();
    });
  };

  var mergeItems = function(callback) {
    if (self.merge) {
      fs.readFile(self.filtersFile, 'utf8', function(error, localResponseFilters) {
        if (error) {
          callback(error);
        }

        localResponseFilters = JSON.parse(localResponseFilters);
        self.data.forEach(function(remoteItem) {
          var localItem = localResponseFilters.find(function(localItem) {
            return (localItem.key === remoteItem.key);
          });
          if (localItem) {
            winston.info('Updating filter: %s', localItem.key);
            if (remoteItem.hasOwnProperty('exclude')) {
              localItem.exclude = remoteItem.exclude;
            } else {
              delete localItem.exclude;
            }

            if (remoteItem.hasOwnProperty('include')) {
              localItem.include = remoteItem.include;
            } else {
              delete localItem.include;
            }
          } else {
            winston.info('Adding filter: ', remoteItem.key);
            localResponseFilters.push(remoteItem);
          }
        });

        self.data = localResponseFilters;
        callback();
      });
    } else {
      callback();
    }
  };

  var writeFile = function(callback) {
    fs.outputFile(
      self.filtersFile,
      JSON.stringify(self.data, null, 2),
      callback
    );
  };

  async.waterfall([getFilters, mergeItems, writeFile], callback);
};
