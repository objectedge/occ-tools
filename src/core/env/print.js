'use strict';

var winston = require('winston');
var _config = require('../config');

module.exports = function(callback) {
  winston.info('name: %s', _config.environment.details.name);
  winston.info('environment: %s', _config.environment.details.env);
  winston.info('url: %s', _config.environment.details.url);
  return callback();
};