'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var Auth = require('../auth');
var OCC = require('../occ');
var config = require('../config');

var _trigger = require('./trigger');
var _check = require('./check');

function Index(environment, options) {
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

util.inherits(Index, EventEmitter);

/**
 * Trigger a search index in OCC.
 * @param  {Function} type The search type (partial|baseline)
 */
Index.prototype.trigger = function(type) {
  var self = this;
  _trigger.call(self, type, function(err) {
    err ? self.emit('error', err) : self.emit('complete', 'Search ' + type + ' index completed.');
  });
};

/**
 * Checks the search index in OCC.
 * @param  {Function} type The search type (partial|baseline)
 */
Index.prototype.status = function() {
  var self = this;
  _check.call(self, function(err) {
    err ? self.emit('error', err) : self.emit('complete', 'Search index listed.');
  });
};

module.exports = Index;