'use strict';

var util = require('util');
var Auth = require('../auth');
var config = require('../config');

var _request = require('./request');
var _publish = require('./publish');

function OCC(environment, auth) {
  this._environment = environment;
  this._endpoint = config.endpoints[environment];
  this._auth = auth || new Auth(environment);
}

/**
 * Make a request to OCC.
 *
 * @param   {String | Object}  opts
 * @param   {Function}         callback   the fn to be execueted after request.
 *
 * The arguments sent to this function can be in following forms:
 *
 * - Using with simple api string: Will assume GET method as default. Example: request('some/path/123', callback);
 * - Using with options object: Allow define custom options to send to OCC. Example: request({api: 'some/path/123', method: 'post', body: ''}, callback);
 */
OCC.prototype.request = function() {
  _request.apply(this, arguments);
};

OCC.prototype.promisedRequest = function() {
  const self = this;
  const [options] = arguments;

  return new Promise((resolve, reject) => {
    const callback = (error, body) => {
      if (error) {
        reject(error);
      } else if (body && (body.errorCode || body.error || parseInt(body.status) >= 400)) {
        callback(`[${body.status || '500'}] ${body.message || 'General error received from OCC.'}`);
      }

      resolve(body);
    };

    _request.apply(self, [options, callback]);
  });
};

/**
 * Publish changes in OCC.
 * @param  {Function} callback The fn to be executed after publishing.
 */
OCC.prototype.publish = function(callback) {
  _publish.call(this, callback);
};

OCC.prototype.checkError = function(error, body, callback) {
  if (error) {
    callback(util.format('%s', error));
  } else if (body && (body.errorCode || body.error || parseInt(body.status) >= 400)) {
    callback(util.format('[%s] %s',  body.status || '500' , body.message || 'General error received from OCC.'));
  }
};

module.exports = OCC;
