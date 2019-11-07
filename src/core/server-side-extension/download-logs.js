'use strict';

var path = require('path');
var winston = require('winston');
var fs = require('fs-extra');
var util = require('util');
var async = require('async');

var _config = require('../config');

function storeFile(name, body, callback) {
  var fileName = path.join(
    _config.dir.server_side_root,
    'logs',
    util.format('%s-%s', name || 'sse', body.filename)
  );
  winston.info('Storing log file %s', fileName);
  fs.outputFile(fileName, body.fileContents, callback);
}

module.exports = function(name, options, callback) {
  var self = this;
  if (name) {
    winston.info('Downloading logs for extension %s level %s for %s...', name, options.level, options.date || 'today' );
  } else {
    winston.info('Downloading log level %s for %s...', options.level, options.date || 'today' );
  }

  var requestOptions = {
    'api': 'logs',
    'method': 'get',
    'qs': {
      'extensionName': name,
      'loggingLevel': options.level,
      'date': options.date
    }
  };
  self._occ.request(requestOptions, function(error, body){
    self._occ.checkError(error, body, callback);

    if (body.items) {
      async.forEachOf(body.items,
        function(logFile, index, eachCallback){
          var eachBody = JSON.parse(logFile);
          if (eachBody.error) {
            winston.error(eachBody.message);
            eachCallback();
          } else {
            storeFile(util.format('%s-%s', name || 'sse', index), eachBody, eachCallback);
          }
        },
        callback);
    } else {
      storeFile(name, body, callback);
    }
  });
};
