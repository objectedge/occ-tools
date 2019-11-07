'use strict';

var async = require('async');
var request = require('request');

/**
 * Get the access token in storage.
 * @param  {Function} callback The fn to be executed after process.
 */
function getAccessToken(callback) {
  this._tokenStorage.get('access', callback);
}

/**
 * Do a login check request to OCC.
 * @param  {String}   accessToken The stored access token.
 * @param  {Function} callback    The fn to be executed after request.
 */
function doCheckLoginRequest(accessToken, callback) {
  request.post({url: this._checkEndpoint, auth: {bearer: accessToken}}, function(err, httpResponse, body) {
    if (err) return callback(err);
    if (typeof body === 'undefined') return callback(new Error('undefined response'));
    var response = JSON.parse(body);
    if (response === null || response.status === '401') return callback(new Error('User not authorized'));
    return callback(null, accessToken);
  });
}

module.exports = function(callback) {
  var self = this;

  async.waterfall([
    getAccessToken.bind(self),
    doCheckLoginRequest.bind(self)
  ], callback);
};