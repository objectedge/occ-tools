'use strict';

var config = require('../config');
var TokenStorage = require('./TokenStorage');
var _signIn = require('./signIn');
var _isLoggedIn = require('./isLoggedIn');
var _refresh = require('./refresh');

var _tokenCache = {};

function Auth(environment) {
  this._env = environment;
  if (!_tokenCache[environment]) {
    _tokenCache[environment] = {};
  }
  this.refreshInterval = null;
  this._refreshTime = 60000;
  this._tokenStorage = new TokenStorage(environment);
  var loginEndpoints = {
    default: 'login',
    mfa: 'mfalogin'
  };

  this._loginEndpoint = config.authEndpoints[environment] + (config.useMFALogin ? loginEndpoints.mfa : loginEndpoints.default);
  this._checkEndpoint = config.authEndpoints[environment] + 'verify';
  this._refreshEndpoint = config.authEndpoints[environment] + 'refresh';
}

function startRefreshInterval(self){
  if (!self._interval) {
    self._interval = setInterval(_refresh.bind(self, function(error, tokens) {
      if (!error) {
        _tokenCache[self._env].access = tokens.access;
      }
    }), self._refreshTime);
  }
}

function clearRefreshInterval(self){
  if (self._interval) {
    clearInterval(self._interval);
    self._interval = null;
  }
}

/**
 * Sign in OCC.
 * @param  {Object}   credentials The user credentials
 * @param  {Function} callback    The fn to be executed after login.
 */
Auth.prototype.signIn = function (credentials, callback) {
  var self = this;
  clearRefreshInterval(self);
  _signIn.call(this, credentials, function(err, tokens) {
    if (err) {
      return callback(err);
    }

    startRefreshInterval(self);
    _tokenCache[self._env] = tokens;
    return callback(null, tokens.access);
  });
};

/**
 * Check if user is signed in.
 * @param  {Function} callback The fn to be executed after check.
 */
Auth.prototype.isLoggedIn = function (callback) {
  var self = this;
  _isLoggedIn.call(this, function(err, accessToken) {
    if (err) {
      clearRefreshInterval(self);
      return callback(err);
    }

    startRefreshInterval(self);
    _tokenCache[self._env].access = accessToken;
    return callback(null, accessToken);
  });
};

/**
 * Get a specifc token.
 * @param  {String}   type     The token type.
 * @param  {Function} callback The fn to be executed after process.
 */
Auth.prototype.getToken = function(type, callback) {
  var self = this;
  if (_tokenCache[self._env][type]) {
    startRefreshInterval(self);
    return callback(null, _tokenCache[self._env][type]);
  }

  this._tokenStorage.get(type, function(err, token) {
    if (err) {
      clearRefreshInterval(self);
      return callback(err);
    }

    startRefreshInterval(self);
    return callback(null, token);
  });
};

module.exports = Auth;
