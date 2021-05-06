'use strict';

var async = require('async');
var winston = require('winston');
var request = require('request');
var fs = require('fs-extra');
var config = require('../config');

/**
 * Mount the config object.
 * @param  {String} endpoint The OCC endpoint.
 * @param  {Object} rawOpts  The raw options.
 */
var mountConfig = function(endpoint, rawOpts) {
  var config = {};

  switch (typeof rawOpts) {
    case 'string':
      config.url = endpoint + rawOpts;
      config.method = 'get';
      config.body = null;
      break;
    case 'object':
      config = rawOpts;
      config.url = rawOpts.url || endpoint + rawOpts.api;
      config.json = rawOpts.body ? true : false;
      break;
    default:
      config = null;
      break;
  }

  return config;
};

function getTokenFromOcc(callback) {
  var self = this;
  var credentials = config.credentials;
  self._auth.isLoggedIn(function(err, token) {
    if (err) return self._auth.signIn(credentials, callback);
    return callback(null, token);
  });
}

/**
 * Get the access token to make the request.
 * Will try first the in-memory cache, then the file cache, then verify if is logged in and get the token.
 * If the token is not cached and is not logged, will make a login and get the token.
 *
 * @param  {Function} callback The fn to be executed after getting the token.
 */
function getToken(callback) {
  var self = this;
  self._auth.getToken('access', function(err, token) {
    if (token) return callback(null, token);
    getTokenFromOcc.call(self, callback);
  });
}

function getFileToken(token, callback) {
  var self = this;
  self._auth.getToken('file', function (err, fileToken) {
    var cookies = [];
    try {
      cookies = JSON.parse(fileToken);
    } catch (e) {}
    return callback(null, token, cookies);
  });
}

/**
 * Reload streams if they were alread processed.
 *
 * @param  {Object} config Request configurations
 */
function reloadStreamsIfNecessary(config) {
  if (config.formData){
    Object.keys(config.formData).forEach(function(key) {
      var value = config.formData[key];
      // check if the property is a stream
      if (value && value.hasOwnProperty('path') && value.hasOwnProperty('closed') && value.closed){
        config.formData[key] = fs.createReadStream(value.path);
      }
    });
  }
}

/**
 * Send a request to OCC.
 * @param  {Object}   config   The request config object.
 * @param  {String}   token    The access token.
 * @param  {Function} callback The fn to be executed after request.
 */
function doRequest(config, token, fileToken, callback) {
  config.auth = {bearer: token};

  if (config.download) {
    var jar = request.jar();
    fileToken.forEach((c) => {
      var cookie = request.cookie(c);
      jar.setCookie(cookie, config.url);
    });
    config.jar = jar;
  }

  reloadStreamsIfNecessary(config);
  winston.debug('Requesting to OCC:', config);

  request[config.method](config, function (err, httpResponse, body) {
    var responseBody;

    try {
      responseBody = config.body ? body : JSON.parse(body);
    } catch(_) {
      responseBody = body;
    }

    if (!config.download){
      winston.debug('Response received from OCC:', body);
    }
    // common resposes
    if (err){
      winston.debug('Received error from OCC:', err);
      return callback(err);
    }

    if (typeof responseBody === 'object' && responseBody.errorCode) {
      winston.debug(body);
      return callback(responseBody);
    }

    if (httpResponse.statusCode === 204) {
      // no content success response
      return callback(null, '');
    } else if (!config.download) {

      if(config.method.toLowerCase() === 'head') {
        return callback(null, { statusCode: httpResponse.statusCode, headers: httpResponse.headers });
      }

      return callback(null, responseBody);
    }
  }).on('response', function (response) {
    // responses with file download
    if (config.download){
      if (response.statusCode < 400){
        var file = config.download;
        var stream = fs.createWriteStream(file).on('finish', callback);
        response.pipe(stream);
      } else {
        callback(null, { status: response && response.statusCode ? response.statusCode : 500 });
      }
    }
  });
}

/**
 * Will try do to a request to OCC. If not succeded, will try n times until succeds or reach max attempts.
 * @param  {Object}   config      The request config object.
 * @param  {String}   token       The access token.
 * @param  {Number}   maxAttempts The max attempts to try.
 * @param  {Function} callback    The fn to be executed after request.
 */
function tryToRequest(config, token, fileToken, maxAttempts, callback) {
  var self = this;
  var attempts = 0;

  var loginAttempt = function (callback) {
    getTokenFromOcc.call(self, function(err, newToken) {
      attempts++;
      winston.debug(err);
      if (err) {
        return callback(err);
      }

      token = newToken;
      return callback();
    });
  };

  async.whilst(
    function() {
      return attempts < maxAttempts;
    },
    function(callback) {
      doRequest(config, token, fileToken, function(err, body) {
        var responseStatus = body && body.status ? parseInt(body.status) : null;

        if (err) {
          var occStatusCode = Object.prototype.toString.call(err) === '[object Object]' && parseInt(err.status);
          attempts++;

          if(occStatusCode === 401) {
            return loginAttempt(callback);
          }

          if(occStatusCode === 403 ) {
            return callback(err.message + '\n\n Try to use a different Auth Method such as TOTP CODE or APP KEY');
          }

          return callback();
        } else if (responseStatus === 401) {
          return loginAttempt(callback);
        } else {
          attempts = maxAttempts;
          return callback(null, body);
        }
      });
    },
    callback
  );
}

module.exports = function(rawOpts, callback) {
  var self = this;
  var config = mountConfig(self._endpoint, rawOpts);

  if (!config) {
    return callback(new Error('invalid options passed'));
  }

  async.waterfall(
    [
      getToken.bind(self),
      getFileToken.bind(self),
      function (token, fileToken, callback) {
        tryToRequest.call(self, config, token, fileToken, 3, callback);
      },
    ],
    callback
  );
};
