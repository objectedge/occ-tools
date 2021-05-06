'use strict';

var async = require('async');
var winston = require('winston');
var request = require('request');
var config = require('../config');

/**
 * Do a login request to OCC.
 * @param  {Object}   credentials The OCC user credentials.
 * @param  {Function} callback    The fn to be executed after request.
 */
function occLoginRequest(credentials, callback) {
  var requestOptions = {
    url: this._loginEndpoint,
    form: credentials
  };

  if(config.useApplicationKey) {
    requestOptions.headers = config.loginHeaderAuth;
  }

  request.post(
    requestOptions,
    function (error, response, body) {
      if (error) {
        return callback(error);
      }

      if (typeof body === 'undefined') {
        return callback(new Error('Undefined response body received from OCC.'));
      }

      var parsedJSON = null;

      try {
        parsedJSON =  JSON.parse(body);
      } catch(exception) {
        winston.debug(exception);
        winston.debug(body);
        return callback(
          'Error authenticating to OCC, please verify if you need to enable '+
          'MFA login for this environment or your credentials are valid.'
        );
      }

      if(!parsedJSON || (parsedJSON && parsedJSON.error)) {
        winston.debug(body);
        return callback(
          'Error authenticating to OCC, please verify your credentials are valid ' +
          'or if your topt_code for MFA login is correct.'
        );
      }

      return callback(null, response, JSON.parse(body));
    }
  );
}

/**
 * Store all received tokens from OCC login request.
 * @param  {String}   httpResponse The http response headers.
 * @param  {Object}   responseBody The response body
 * @param  {Function} callback     The fn to be executed after storage process.
 */
function storeTokens(httpResponse, responseBody, callback) {
  var self = this;
  var tokens = {
    access: responseBody.access_token,
    file: httpResponse.headers['set-cookie'][0]
  };

  async.each(Object.keys(tokens), function(type, callback) {
    self._tokenStorage.save(type, tokens[type], callback);
  }, function(err) {
    return callback(err, tokens);
  });
}

module.exports = function(credentials, callback) {
  var self = this;
  var _tokens;

  async.waterfall([
    function(callback) {
      occLoginRequest.call(self, credentials, callback);
    },
    function(httpResponse, responseBody, callback) {
      storeTokens.call(self, httpResponse, responseBody, function(err, tokens) {
        _tokens = tokens;
        return callback(err);
      });
    }
  ], function(err) {
    return err ? callback(err) : callback(null, _tokens);
  });
};
