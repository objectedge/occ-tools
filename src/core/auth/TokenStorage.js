'use strict';

var fs = require('fs-extra');
var config = require('../config');

function TokenStorage(environment) {
  this.tokenDir = config.tokens[environment];
}

/**
 * Store a new token.
 * @param  {String}   type     The type of token to be saved.
 * @param  {[type]}   token    The token data.
 * @param  {Function} callback The fn to be executed after saving token.
 */
TokenStorage.prototype.save = function(type, token, callback) {
  fs.outputFile(this.tokenDir[type], token, callback);
};

/**
 * Get a stored token.
 * @param  {String}   type     The type of token to be fetched.
 * @param  {Function} callback The fn to be executed after getting the token.
 */
TokenStorage.prototype.get = function(type, callback) {
  fs.readFile(this.tokenDir[type], 'utf8', function(err, data) {
    return callback(null, err ? '' : data);
  });
};

/**
 * Remove Token.
 * @param  {String}   type     The type of token to be fetched.
 * @param  {Function} callback The fn to be executed after getting the token.
 */
TokenStorage.prototype.remove = function(type, callback) {
  fs.remove(this.tokenDir[type], function(error) {
    if(error) {
      return callback(error);
    }

    return callback();
  });
};

/**
 * Remove All Tokens.
 * @param  {Function} callback The fn to be executed after getting the token.
 */
TokenStorage.prototype.removeAll = function(callback) {
  Object.keys(config.tokens).forEach(function(env) {
    try {
      fs.removeSync(config.tokens[env].access);
      fs.removeSync(config.tokens[env].file);
    } catch(error) {
      callback(error)
    }
  });

  callback();
};

module.exports = TokenStorage;
