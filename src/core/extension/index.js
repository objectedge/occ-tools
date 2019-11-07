'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var OCC = require('../occ');
var Auth = require('../auth');

var _generate = require('./generate');
var _upgrade = require('./upgrade');
var _restore = require('./restore');
var _get = require('./get');

function Extension() {
  EventEmitter.call(this);
  this._auth = new Auth('adminUI');
  this._occ = new OCC('adminUI', this._auth);
}

util.inherits(Extension, EventEmitter);

/**
 * Generate the extension file for widgets.
 *
 * @param  {Object}   options  The options object.
 */
Extension.prototype.generate = function(options) {
  var self = this;
  _generate.call(this, options, function(err) {
    err ? self.emit('error', err) : self.emit('complete', 'Extension generation process completed.');
  });
};

/**
 * Upgrades an extension.
 *
 * @param  {Object}   options  The options object.
 */
Extension.prototype.upgrade = function(name, options) {
  var self = this;
  _upgrade.call(this, name, options, function(err) {
    err ? self.emit('error', err) : self.emit('complete', 'Extension upgrade process completed.');
  });
};

/**
 * Restore a backup of an extension.
 *
 * @param  {Object}   options  The options object.
 */
Extension.prototype.restore = function(name, file, options) {
  var self = this;
  _restore.call(this, name, file, options, function(err) {
    err ? self.emit('error', err) : self.emit('complete', 'Extension restore process completed.');
  });
};

/**
 * Get extension data.
 *
 * @param  {Object}   callback  The callback to get the extension data.
 */
Extension.prototype.get = function(name, callback) {
  _get.call(this, name, this._occ, callback);
};

module.exports = Extension;
