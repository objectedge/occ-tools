'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var Auth = require('../auth');
var OCC = require('../occ');
var config = require('../config');

var _trigger = require('./trigger');
var _check = require('./check');

function Publish(environment, options) {
  if (!environment) {
    throw new Error('OCC environment not defined.');
  }

  EventEmitter.call(this);
  this._environment = environment;
  this._endpoint = config.endpoints[environment];
  this._auth = new Auth(environment);
  this._occ = new OCC(environment, this._auth);
  this.options = options;
}

util.inherits(Publish, EventEmitter);

/**
 * Trigger a Publish in OCC.
 * @param  {Function} type The Publish type (partial|baseline)
 */
Publish.prototype.trigger = function() {
  var self = this;
  _trigger.call(self, function(err) {
    err
      ? self.emit('error', err)
      : self.emit('complete', 'Publish completed.');
  });
};

/**
 * Checks the  Publish in OCC.
 */
Publish.prototype.status = function() {
  var self = this;
  _check.call(self, function(err) {
    err
      ? self.emit('error', err)
      : self.emit('complete', 'Done.');
  });
};

module.exports = Publish;
