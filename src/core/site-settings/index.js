'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var OCC = require('../occ');
var Auth = require('../auth');

var _generate = require('./generate');


function SiteSettings() {
  EventEmitter.call(this);
  this._auth = new Auth('admin');
  this._occ = new OCC('admin', this._auth);
}

util.inherits(SiteSettings, EventEmitter);

/**
 * Generate the SiteSettings boilerplate.
 * @param  {String} name    The SiteSettings name.
 * @param  {Object} options The options object.
 */
SiteSettings.prototype.generate = function(name, options) {
  var self = this;
  _generate.call(this, name, options, function(err) {
    err ? self.emit('error', err) : self.emit('complete', 'Site settings generation process completed.');
  });
};

module.exports = SiteSettings;