'use strict';

var fs = require('fs-extra');
var path = require('path');
var util = require('util');
var async = require('async');
var winston = require('winston');

var _configs = require('../config');

/**
 * Get details about theme info from OCC.
 * @param  {[type]}   item     The theme info object.
 * @param  {Function} callback The fn to be executed after info.
 */
function getThemeDetails(item, callback) {
  this._occ.request(util.format('themes/%s/source', item.id), callback);
}

/**
 * Write the downloaded theme files in file system.
 * @param  {Object}   item         The theme info object.
 * @param  {Object}   themeDetails The theme details object.
 * @param  {Function} callback     The fn to be executed after write.
 */
function writeThemeFiles(item, themeDetails, callback) {
  var themeDir = path.join(_configs.dir.project_root, 'themes', item.name + '_' + item.id);
  winston.debug('Themes directory: %s', themeDir);

  async.parallel(
    [
      function (callback) {
        winston.info('Writing %s styles.less', item.id);
        fs.outputFile(path.join(themeDir, 'styles.less'), themeDetails.styles, callback);
      },
      function (callback) {
        winston.info('Writing %s variables.less', item.id);
        fs.outputFile(path.join(themeDir, 'variables.less'), themeDetails.variables, callback);
      },
      function (callback) {
        winston.info('Writing %s additionalStyles.less', item.id);
        fs.outputFile(path.join(themeDir, 'additionalStyles.less'), themeDetails.additionalStyles, callback);
      },
    ],
    callback
  );
}

/**
 * Download a single theme.
 * @param  {Object}   item     The theme info object.
 * @param  {Function} callback The fn to be executed after download.
 */
function downloadTheme(item, callback) {
  var self = this;

  winston.info('Downloading theme %s...', item.id);
  async.waterfall([
    function(callback) {
      getThemeDetails.call(self, item, callback);
    },
    function(themeDetails, callback) {
      writeThemeFiles.call(self, item, themeDetails, callback);
    }
  ], callback);
}

/**
 * Downloads the themes.
 * @param  {String}   themeId    The theme ID. If ommited, downloads all themes.
 * @param  {Object}   themesInfo The themes info object.
 * @param  {Function} callback   The fn to be executed after download.
 */
function downloadThemes(themeId, themesInfo, callback) {
  var self = this;
  var themesCount = themesInfo.items && themesInfo.items.length || 1;
  winston.info('Downloading %d themes', themesCount);
  var dt = function(item, callback) {
    downloadTheme.call(self, item, callback);
  };

  themesCount > 1 ? async.each(themesInfo.items, dt, callback) : dt(themesInfo, callback);
}

module.exports = function(themeId, callback) {
  var self = this;

  async.waterfall([
    function(callback) {
      self._occ.request(themeId ? util.format('themes/%s', themeId) : 'themes?type=custom', function(error, themesInfo){
        if (error || (themesInfo.status && parseInt(themesInfo.status) >= 400)){
          callback(error || themesInfo.message);
        }
        callback(null, themesInfo);
      });
    },
    function(themesInfo, callback) {
      downloadThemes.call(self, themeId, themesInfo, callback);
    }
  ], callback);
};
