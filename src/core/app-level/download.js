'use strict';

var fs = require('fs-extra');
var os = require('os');
var path = require('path');
var util = require('util');
var async = require('async');
var winston = require('winston');
var extract = require('extract-zip');
var _config = require('../config');

var PARALLEL_DOWNLOADS = 8;

module.exports = function (appLevelName, mainCallback) {
  var self = this;

  var getAppLevelInfo = function (callback) {
    self._occ.request('applicationJavaScript', function (error, appLevelInfo) {
      if (error || (appLevelInfo.status && parseInt(appLevelInfo.status) >= 400)) {
        callback(error || appLevelInfo.message);
      }

      var appLevels = Object.keys(appLevelInfo.items);

      if (appLevelName) {
        appLevels = appLevels.filter((appLevel) => appLevel == appLevelName + '.js');
      }

      callback(null, appLevels);
    });
  };

  /**
   * Downloads email template from OCC.
   */
  var downloadFromOCC = function (appLevels, callback) {
    // download the files in parallel
    async.eachLimit(
      appLevels,
      PARALLEL_DOWNLOADS,
      function (appLevel, cb) {
        async.waterfall([downloadOneFromOCC.bind(self, appLevel), saveFile], cb);
      },
      callback
    );
  };

  var downloadOneFromOCC = function (appLevel, callback) {
    winston.info('Downloading %s appLevel template', appLevel);
    var options = {
      api: util.format('/applicationJavaScript/%s', appLevel),
      method: 'get',
    };
    self._occ.request(options, function (error, body) {
      if (error || (body && body.status == 404)) {
        callback(error || 'Email not foun on OCC');
      }
      callback(null, appLevel, body.source);
    });
  };

  var saveFile = function (appLevel, source, callback) {
    winston.info('Saving app-level %s', appLevel);
    var name = appLevel.split('.').slice(0, -1).join('.');
    var appLevelDir = path.join(_config.dir.project_root, 'app-level', name);

    fs.outputFile(path.join(appLevelDir, name + '.js'), source, callback);
  };

  async.waterfall([getAppLevelInfo, downloadFromOCC], mainCallback);
};
