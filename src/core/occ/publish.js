'use strict';

var util = require('util');

module.exports = function(callback) {
  if (this._environment === 'adminUI') return callback(new Error(util.format('Publish not allowed in %s environment', this._environment)));
  var opts = {
    api: 'publish',
    method: 'post',
    body: {}
  };
  this.request(opts, callback);
};