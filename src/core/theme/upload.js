'use strict';

var fs = require('fs-extra');
var path = require('path');
var util = require('util');
var async = require('async');
var winston = require('winston');

var _configs = require('../config');

/**
 * Read the theme files from file system.
 * @param  {Object}   item     The theme info object.
 * @param  {Function} callback The fn to be executed after read.
 */
function readThemeFiles(item, callback) {
  var themeDir = path.join(_configs.dir.project_root, 'themes', item.name + '_' + item.id);
  var themeFiles = {};

  async.parallel([
    function(callback) {
      fs.readFile(path.join(themeDir, 'styles.less'), 'utf8', function(err, fileContent) {
        if (err) return callback(err);
        themeFiles.styles = fileContent;
        return callback();
      });
    },
    function(callback) {
      fs.readFile(path.join(themeDir, 'variables.less'), 'utf8', function(err, fileContent) {
        if (err) return callback(err);
        themeFiles.variables = fileContent;
        return callback();
      });
    },
    function(callback) {
      const additionalStylesPath = path.join(themeDir, 'additionalStyles.less');
      if (fs.existsSync(additionalStylesPath)) {
        fs.readFile(path.join(themeDir, 'additionalStyles.less'), 'utf8', function(err, fileContent) {
          if (err) return callback(err);
          themeFiles.additionalStyles = fileContent;
          return callback();
        });
      } else {
        return callback();
      }
    }
  ], function(err) {
    return callback(err, themeFiles);
  });
}

/**
 * Upload the theme files to OCC.
 * @param  {Object}   item       The theme info object.
 * @param  {Object}   themeFiles The theme files object.
 * @param  {Function} callback   The fn to be executed after upload.
 */
function uploadThemeFiles(item, themeFiles, callback) {
  this._occ.request({
    api: util.format('themes/%s/source', item.id),
    method: 'put',
    body: {
      styles: themeFiles.styles,
      variables: themeFiles.variables
    }
  }, function(error, body) {
    if (error || (body && body.errorCode)) {
      callback(error || body.message);
    }
    callback();
  });
}

/**
 * Upload a single theme.
 * @param  {Object}   item     The theme info object.
 * @param  {Function} callback The fn to be executed after upload.
 */
function uploadTheme(item, callback) {
  var self = this;

  winston.info('Uploading theme %s...', item.id);
  async.waterfall([
    function(callback) {
      readThemeFiles.call(self, item, callback);
    },
    function(themeFiles, callback) {
      uploadThemeFiles.call(self, item, themeFiles, callback);
    }
  ], callback);
}

/**
 * Uploads the themes to OCC.
 * @param  {String}   themeId    The theme ID. If ommited, uploads all themes.
 * @param  {Object}   themesInfo The theme info object.
 * @param  {Function} callback   The fn to be executed after upload.
 */
function uploadThemes(themeId, themesInfo, callback) {
  var self = this;
  var themesCount = themesInfo.items && themesInfo.items.length || 1;
  var currentCount = 0;
  var ut = function(item, callback) {
    winston.info('Theme %d of %d', ++currentCount, themesCount);
    uploadTheme.call(self, item, callback);
  };

  themesCount > 1 ? async.each(themesInfo.items, ut, callback) : ut(themesInfo, callback);
}

module.exports = function(themeId, callback) {
  var self = this;

  async.waterfall([
    function(callback) {
      var url = themeId ? util.format('themes/%s', themeId) : 'themes?type=custom';
      self._occ.request(url, function(error, body) {
        if (error || (body && body.errorCode)) {
          callback(error || body.message);
        }
        callback(null, body);
      });
    },
    function(themesInfo, callback) {
      uploadThemes.call(self, themeId, themesInfo, callback);
    }
  ], function(err) {
    return callback(err);
  });
};
