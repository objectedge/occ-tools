'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var OCC = require('../occ');
var Auth = require('../auth');

var _download = require('./download');
var _upload = require('./upload');
var _generate = require('./generate');
var _info = require('./info');

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

function Widget() {
  EventEmitter.call(this);
  this._auth = new Auth(_settings.env);
  this._occ = new OCC(_settings.env, this._auth);
  this._settings = _settings;
}

util.inherits(Widget, EventEmitter);

/**
 * Downloads a widget.
 * @param  {String} widgetId The widget ID. If ommited, will download all widgets.
 *
 * Will emit a 'complete' event when the download has been completed, or emit a 'error'
 * event when an error occurs.
 */
Widget.prototype.download = function(widgetId, settings) {
  var self = this;
  _download.call(this, widgetId, settings, function(err) {
    err ? self.emit('error', err) : self.emit('complete', 'Widget download process completed.');
  });
};

/**
 * Uploads a widget.
 * @param  {String} widgetId The widget ID. If ommited, will upload all widgets.
 * @param  {Object} options  The options object.
 */
Widget.prototype.upload = function(widgetId, options) {
  var self = this;
  _upload.call(this, widgetId, options, function(err) {
    err ? self.emit('error', err) : self.emit('complete', 'Widget upload process completed.');
  });
};

/**
 * Generate the widget boilerplate.
 * @param  {String} name    The widget name.
 * @param  {Object} options The options object.
 */
Widget.prototype.generate = function(name, options) {
  var self = this;
  _generate.call(this, name, options, function(err) {
    err ? self.emit('error', err) : self.emit('complete', 'Widget generation process completed.');
  });
};

Widget.prototype.info = function(id) {
  var self = this;
  _info.call(this, id, function(err, info) {
    err ? self.emit('error', err) : self.emit('complete', info);
  });
};


module.exports = Widget;
