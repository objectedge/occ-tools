'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var OCC = require('../occ');
var Auth = require('../auth');

var _download = require('./download');
var _upload = require('./upload');
var _generate = require('./generate');
var _build = require('./build');
var _downloadParsedCss = require('./downloadParsedCss');

function Theme(environment, options) {
  if (!environment) {
    throw new Error('Theme environment not defined.');
  }

  EventEmitter.call(this);
  this._environment = environment;
  this._auth = new Auth(environment);
  this._occ = new OCC(environment, this._auth);
  this.options = options;
}

util.inherits(Theme, EventEmitter);

/**
 * Downloads themes from OCC.
 * @param  {String}   themeId  (Optional) The theme ID to be downloaded. If ommited, downloads all themes.
 */
Theme.prototype.download = function(themeId) {
  var self = this;
  _download.call(self, themeId, function(err) {
    err ? self.emit('error', err) : self.emit('complete', 'Theme downloading process completed.');
  });
};

/**
 * Uploads themes to OCC.
 * @param  {String}   themeId  (Optional) The theme ID to be uploaded. If ommited, uploads all themes.
 */
Theme.prototype.upload = function(themeId) {
  var self = this;
  _upload.call(self, themeId, function(err) {
    err ? self.emit('error', err) : self.emit('complete', 'Theme uploading process completed.');
  });
};

/**
 * Generate the theme styles from less files.
 * It will update the styleguide using hologram project.
 */
Theme.prototype.generate = function() {
  var self = this;
  
  _generate.call(self, function(err) {
    err ? self.emit('error', err) : self.emit('complete', 'Theme generation process completed.');
  }, self.options);
};

Theme.prototype.build = function(themeId) {
  var self = this;
  
  _build.call(self, themeId, self.options, function(err) {
    err ? self.emit('error', err) : self.emit('complete', 'Theme build process completed.');
  });
};

/**
 * Download the store parsed CSS.
 * @param  {String}   dest     The destination folder.
 */
Theme.prototype.downloadParsedCSS = function(dest, siteId) {
  var self = this;
  
  _downloadParsedCss.call(self, dest, function(err) {
    err ? self.emit('error', err) : self.emit('complete', 'Theme CSS downloading process completed.');
  }, self.options, siteId);
};

module.exports = Theme;