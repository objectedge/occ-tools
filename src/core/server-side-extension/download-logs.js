'use strict';

var os = require('os');
var glob = require('glob');
var path = require('path');
var winston = require('winston');
var fs = require('fs-extra');
var util = require('util');
var async = require('async');
var extract = require('extract-zip');
var dateFormat = require('date-fns/format');

var _config = require('../config');

module.exports = function(name, options, callback) {
  var self = this;
  var tempFile = path.join(os.tmpdir(), 'sse-logs.zip');
  var loggingLevel = options.level || 'debug';
  var logsFolder = path.join(_config.dir.server_side_root, 'logs');

  var downloadLogFile = function(callback) {
    if (name) {
      winston.info('Downloading logs for extension %s level %s for %s...', name, options.level, options.date || 'today');
    } else {
      winston.info('Downloading log level %s for %s...', options.level, options.date || 'today');
    }

    var requestOptions = {
      'api': 'logs',
      'method': 'get',
      'qs': {
        'extensionName': name,
        'loggingLevel': loggingLevel,
        'date': options.date
      },
      download: tempFile
    };

    self._occ.request(requestOptions, function(error, body) {
      self._occ.checkError(error, body, callback);

      callback();
    });
  };

  var extractLogFile = function(callback) {
    winston.info('Extracting log files...');
    extract(
      tempFile,
      { dir: logsFolder },
      function(err) {
        if (err) {
          callback('Error extracting the file: ' + err);
          return;
        }

        glob('_?_' + loggingLevel + '.log', { cwd: logsFolder }, function(err, files) {
          if (err) {
            callback('Error renaming log file: ' + err);
            return;
          }

          var loggingDate = options.date || dateFormat(new Date(), 'yyyyMMdd');

          async.each(files, function(fileName, callback) {
            fs.move(
              path.join(logsFolder, fileName),
              path.join(logsFolder, + loggingDate + fileName),
              { override: true },
              callback
            );
          }, callback);
        });
      }
    );
  };

  var clearTempFile = function(callback) {
    winston.info('Removing temporary files...');
    fs.unlink(tempFile, callback);
  };

  async.waterfall([downloadLogFile, extractLogFile, clearTempFile], callback);
};
