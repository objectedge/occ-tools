'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var OCC = require('../occ');
var Auth = require('../auth');

var _download = require('./download');
var _upload = require('./upload');

function Search(environment, options) {
  if (!environment) {
    throw new Error('Search environment not defined.');
  }

  EventEmitter.call(this);
  this._environment = environment;
  this._auth = new Auth(environment);
  this._occ = new OCC(environment, this._auth);
  this.options = options;
}

util.inherits(Search, EventEmitter);

/**
 * Downloads search app from OCC.
 * @param  {String}   app  (Optional) The app name to be downloaded. If ommited, downloads cloud app.
 */
Search.prototype.download = function(app) {
  var self = this;
  var appName = app ? app : 'cloud';
  _download.call(self, appName, function(err) {
    err ? self.emit('error', err) : self.emit('complete', 'Search app download completed.');
  });
};

/**
 * Uploads search resource to OCC.
 * @param  {String}   resource (Optional) The resource to be uploaded.
 */
Search.prototype.upload = function(path) {
  var self = this;
  var pathname = path ? path : '/';
  _upload.call(self, pathname, function(err) {
    err ? self.emit('error', err) : self.emit('complete', 'Search app upload completed.');
  });
};

module.exports = Search;