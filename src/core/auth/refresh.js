var async = require('async');
var request = require('request');
var winston = require('winston');

/**
 * Get the access token in storage.
 * @param  {Function} callback The fn to be executed after process.
 */
function getAccessToken(callback) {
  this._tokenStorage.get('access', callback);
}

/**
 * Do a refresh request to OCC.
 * @param  {Object}   credentials The OCC user credentials.
 * @param  {Function} callback    The fn to be executed after request.
 */
function occRefreshRequest(token, callback) {
  var self = this;
  request.post(
    {
      url: self._refreshEndpoint,
      headers: { Authorization: 'Bearer ' + token },
      form: {}
    },
    function (error, response, json) {
      if (error || !json) {
        return callback(error || 'Undefined refresh response.');
      }

      try {
        var body =  JSON.parse(json);
        if (!body || body.error) {
          return callback('Error refreshing the token');
        }

        winston.debug('%s token refreshed', self._env);
        return callback(null, response, body);
      } catch(error) {
        return callback('Error parsing the refresh JSON');
      }
    }
  );
}

/**
 * Store all received tokens from OCC login request.
 * @param  {String}   response The http response headers.
 * @param  {Object}   body The response body
 * @param  {Function} callback     The fn to be executed after storage process.
 */
function storeTokens(response, body, callback) {
  var self = this;
  var tokens = {
    access: body.access_token
  };

  async.each(Object.keys(tokens), function(type, callback) {
    self._tokenStorage.save(type, tokens[type], callback);
  }, function(error) {
    return callback(error, tokens);
  });
}

module.exports = function(callback) {
  var self = this;
  var _tokens;

  async.waterfall([

    getAccessToken.bind(self),
    occRefreshRequest.bind(self),
    function(httpResponse, responseBody, callback) {
      storeTokens.call(self, httpResponse, responseBody, function(error, tokens) {
        _tokens = tokens;
        return callback(error);
      });
    }
  ], function(error) {
    return error ? callback(error) : callback(null, _tokens);
  });
};
