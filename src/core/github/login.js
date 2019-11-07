'use strict';

var prompt = require('prompt');
var winston = require('winston');
var colors = require('colors/safe');
var _github;

var promptConfig = {
  properties: {
    username: {
      description: colors.green('Github\'s username'),
      required: true
    },
    password: {
      hidden: true,
      description: colors.green('Github\'s password'),
      required: true
    }
  }
};

function githubLogin(githubCredentials, callback) {
  if (_github.auth) {
    callback();
    return;
  }

  _github.authenticate(githubCredentials);

  callback();
}

module.exports = function (github, callback) {
  _github = github;

  //Should ensure we are receiving the last configs
  delete require.cache[require.resolve('../config')];  
  var _config = require('../config');

  // Fallback to basic authentication
  if (!_config.github.type || (!_config.github.username && !_config.github.password && !_config.github.token)) {
    winston.info('Please, enter your github credentials:');
    prompt.start();
    prompt.get(promptConfig, function (err, result) {
      githubLogin({
        type: 'basic',
        username: result.username,
        password: result.password
      }, callback);
    });
  } else {
    winston.info('Using stored credentials (%s).', _config.github.username || 'token');
    githubLogin(_config.github, callback);
  }
};
