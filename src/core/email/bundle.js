'use strict';

var async = require('async');
var winston = require('winston');
var fs = require('fs-extra');
var path = require('path');
var Glob = require('glob').Glob;

var _config = require('../config');

// RegEx to find all includes in the template
var includeRegExp = /<#include\s+["']([-a-zA-Z0-9.*/_?|+@()[\]^!]+)["'].*>/g;

/**
 * Find the files references of included files for a given glob pattern
 */
function getFiles(globPattern, callback) {
  var self = this;
  var options = {
    cwd: path.join(self._emailsFolder, path.dirname(globPattern)),
    absolute: true
  };

  var globCallback = function (error, fileList) {
    if (error) {
      callback(error);
    }

    if (!fileList || !fileList.length) {
      callback();
    }

    self._fileMap[globPattern] = self._fileMap[globPattern].concat(fileList);
    callback();
  };
  new Glob(path.basename(globPattern), options, globCallback);
}

/**
 * Get all included expressions on template file
 */
function getIncludeExpressions(string, callback) {
  var matches = [];
  var match;
  while (match = includeRegExp.exec(string)) {
    matches.push(match[1]);
  }

  this._matches = matches;
  callback(null);
}

/**
 * Escape a string to match a string litteraly inside a regex
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get all included files
 */
function getIncludedFiles(callback){
  var self = this;
  async.each(
    self._matches,
    function(match, ecallback){
      self._fileMap[match] = [];
      getFiles.call(self, match, ecallback);
    },
    callback
  );
}

/**
 * Replace the include expressions on template
 */
function replaceIncludedFiles(data, callback){
  var self = this;
  async.eachLimit(
    self._matches, 1,
    function (match, callback) {
      var include = '';
      self._fileMap[match].forEach(function(file){
        include += fs.readFileSync(file, 'utf8');
      });
      data = data.replace(
        new RegExp( '<#include\\s+["\']' + escapeRegExp(match) + '["\'].*>', 'g'),
        include
      );
      callback();
    },
    function(err){
      if (err){
        winston.error(err);
        callback('Error replacing included files in template');
      }else {
        callback(null, data);
      }
    }
  );
}

module.exports = function(data, callback) {
  var self = {};
  self._emailsFolder = path.join(_config.dir.project_root, 'emails');
  self._matches = [];
  self._fileMap = {};

  async.waterfall(
    [
      getIncludeExpressions.bind(self, data),
      getIncludedFiles.bind(self),
      replaceIncludedFiles.bind(self, data)
    ],
    function(err, data){
      callback(data);
    }
  );
};
