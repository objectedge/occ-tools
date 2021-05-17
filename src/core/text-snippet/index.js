'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var OCC = require('../occ');
var Auth = require('../auth');

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

function TextSnippet() {
  EventEmitter.call(this);
  this._auth = new Auth(_settings.env);
  this._occ = new OCC(_settings.env, this._auth);
  this._settings = _settings;
}

util.inherits(TextSnippet, EventEmitter);

/**
 * Download text snippets from OCC.
 *
 * @param  {Object} options The options object.
 */
 TextSnippet.prototype.download = function (options) {
  var self = this;
  _download.call(this, options, function (err) {
    err ? self.emit('error', err) : self.emit('complete', 'Text snippets downloaded.');
  });
};

module.exports = TextSnippet;
