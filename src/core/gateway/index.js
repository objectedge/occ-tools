'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var OCC = require('../occ');
var Auth = require('../auth');

var _generate = require('./generate');


function Gateway() {
  EventEmitter.call(this);
  this._auth = new Auth('admin');
  this._occ = new OCC('admin', this._auth);
}

util.inherits(Gateway, EventEmitter);

/**
 * Generate the Gateway boilerplate.
 * @param  {String} name    The Gateway name.
 * @param  {Object} options The options object.
 */
Gateway.prototype.generate = function(name, options) {
  var self = this;
  _generate.call(this, name, options, function(err) {
    err ? self.emit('error', err) : self.emit('complete', 'Gateway generation process completed.');
  });
};

module.exports = Gateway;