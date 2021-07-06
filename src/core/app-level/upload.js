'use strict';

var fs = require('fs-extra');
var path = require('path');
var async = require('async');
var winston = require('winston');
var util = require('util');
var bundleAppLevel = require('../app-level/bundle');
var _config = require('../config');


module.exports = function(appLevelNames, settings, callback) {
  var self = this;

  var uploadAppLevel = function(outputFile, outputFileName, outputFilePath, entryFilePath, stats, callback) {
    winston.info('Uploading app-level code...');
    async.waterfall([
      function(callback) {
        fs.readFile(outputFile, 'utf8', callback);
      },
      function(fileData, callback) {
        var options = {
          api: util.format('/applicationJavaScript/%s/', outputFileName),
          method: 'put',
          body: {
            source: fileData
          }
        };
        self._occ.request(options, function(error, data) {
          if (error) return callback(error);
          if (data && data.errorCode) {
            winston.warn('%s: %s - %s', appLevel, data.errorCode, data.message);
          }
          return callback();
        });
      },
      function(callback) {
        if (stats && stats.es5) {
          callback();
        } else {
          bundleAppLevel.clear(outputFilePath, entryFilePath, callback);
        }
      }
    ], function(error){
      if (error) callback(error);
      callback(null);
    });
  };

  async.eachSeries(appLevelNames, function(appLevel, callback) {
    winston.info('Uploading app-level %s', appLevel);
    async.waterfall([
      bundleAppLevel.bundle.bind(this, {
        'dir': path.join(_config.dir.project_root, 'app-level'),
        'name': appLevel
      }),
      uploadAppLevel
    ], callback);
  }, callback)
};
