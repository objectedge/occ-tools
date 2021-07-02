'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var OCC = require('../occ');
var Auth = require('../auth');

var _generate = require('./generate');
var _list = require('./list');
var _upload = require('./upload');
var _download = require('./download');

function AppLevel() {
  EventEmitter.call(this);
  this._auth = new Auth('admin');
  this._occ = new OCC('admin', this._auth);
}

util.inherits(AppLevel, EventEmitter);

/**
 * Generate the app level boilerplate.
 * @param  {String} name    The app level name.
 * @param  {Object} options The options object.
 */
AppLevel.prototype.generate = function(name, options) {
  var self = this;
  _generate.call(this, name, options, function(err) {
    err ? self.emit('error', err) : self.emit('complete', 'App-level generation process completed.');
  });
};

/**
 * Upload app level to OCC.
 * @param  {String} names    The app level names.
 * @param  {Object} options The options object.
 */
AppLevel.prototype.upload = function(names, options) {
  var self = this;
  _upload.call(this, names, options, function(err) {
    err ? self.emit('error', err) : self.emit('complete', 'App-level upload process completed.');
  });
};

/**
 * List app-levels from OCC.
 *
 * @param  {Object} options The options object.
 */
AppLevel.prototype.list = function(options) {
  var self = this;
  _list.call(this, options, function(err) {
    err ? self.emit('error', err) : self.emit('complete', 'App-levels listed.');
  });
};

/**
 * Download app-levels from OCC.
 *
 * @param  {Object} options The options object.
 */
 AppLevel.prototype.download = function (options) {
  var self = this;
  _download.call(this, options, function (err) {
    err ? self.emit('error', err) : self.emit('complete', 'App-levels downloaded.');
  });
};

module.exports = AppLevel;
