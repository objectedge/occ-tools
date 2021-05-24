'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var OCC = require('../occ');
var Auth = require('../auth');

var _generate = require('./generate');
var _download = require('./download');

var _settings = {
  env: 'adminUI',
  folders: {
    oracle: {
      source: '100'
    },
    objectedge: {
      source: '101'
    }
  }
};

function Element() {
  EventEmitter.call(this);
  this._auth = new Auth(_settings.env);
  this._occ = new OCC(_settings.env, this._auth);
  this._settings = _settings;
}

util.inherits(Element, EventEmitter);

/**
 * Generate the Element boilerplate.
 * @param  {String} name    The element name.
 * @param  {Object} options The options object.
 */
Element.prototype.generate = function(name, options) {
  var self = this;
  _generate.call(this, name, options, function(err) {
    err ? self.emit('error', err) : self.emit('complete', 'Element generation process completed.');
  });
};

/**
 * Download elements from OCC.
 *
 * @param  {Object} options The options object.
 */
Element.prototype.download = function (options) {
  var self = this;
  _download.call(this, options, function (err) {
    err ? self.emit('error', err) : self.emit('complete', 'Elements downloaded.');
  });
};

module.exports = Element;
