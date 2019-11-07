'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var OCC = require('../occ');
var Auth = require('../auth');

var _upload = require('./upload');
var _uploadCommand = require('./uploadCommand');
var _list = require('./list');
var _delete = require('./delete');
var _download = require('./download');

/**
 * Commands for handling files in OCC
 *
 * @param {String} environment the OCC environment
 * @param {Object} options command options
 */
function Files(environment, options) {
  if (!environment) {
    throw new Error('Environment not defined.');
  }

  EventEmitter.call(this);
  this._environment = environment;
  this._auth = new Auth(environment);
  this._occ = new OCC(environment, this._auth);
  this.options = options;
}

util.inherits(Files, EventEmitter);

/**
 * Upload a file from a source to a destination
 *
 * @param {String} srcPath
 * @param {String} destPath
 */
Files.prototype.upload = function (srcPath, destPath) {
  var self = this;
  _upload.call(this, srcPath, destPath, function (err) {
    err ? self.emit('error', err) : self.emit('complete', 'File upload process completed.');
  });
};

/**
 * Upload one or more files to OCC based on a glob pattern
 *
 * @param {String} filePath a valid glob pattern
 * @param {Object} options command options
 */
Files.prototype.uploadCommand = function (filePath, options) {
  var self = this;
  _uploadCommand.call(this, filePath, options, function (err) {
    err ? self.emit('error', err) : self.emit('complete', 'File upload process completed.');
  });
};

/**
 * List files from OCC
 *
 * @param {Object} options command options
 */
Files.prototype.list = function (options) {
  var self = this;
  _list.call(this, options, function (err) {
    err ? self.emit('error', err) : self.emit('complete', 'Files listed.');
  });
};

/**
 * Download files from OCC
 *
 * @param {String} fileName the file name (partial match)
 * @param {Object} options command options
 */
Files.prototype.download = function (fileName, options) {
  var self = this;
  _download.call(this, fileName, options, function (err) {
    err ? self.emit('error', err) : self.emit('complete', 'Files downloaded.');
  });
};

/**
 * Delete files from OCC
 *
 * @param {String} fileName the file name (partial match)
 * @param {Object} options command options
 */
Files.prototype.delete = function (fileName, options) {
  var self = this;
  _delete.call(this, fileName, options, function (err) {
    err ? self.emit('error', err) : self.emit('complete', 'Files deleted.');
  });
};

module.exports = Files;