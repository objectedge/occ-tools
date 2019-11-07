'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var OCC = require('../occ');
var Auth = require('../auth');

var _download = require('./download');
var _upload = require('./upload');
var _delete = require('./delete');

/**
 * Commands for handling response filters in OCC
 *
 * @param {String} environment the OCC environment
 * @param {Object} options command options
 */
function ResponseFilter(environment, options) {
  if (!environment) {
    throw new Error('Environment not defined.');
  }

  EventEmitter.call(this);
  this._environment = environment;
  this._auth = new Auth(environment);
  this._occ = new OCC(environment, this._auth);
  this.options = options;
}

util.inherits(ResponseFilter, EventEmitter);

/**
 * Download filters from OCC
 *
 * @param {Object} options command options
 */
ResponseFilter.prototype.download = function(options) {
  var self = this;
  _download.call(this, options, function(err) {
    err
      ? self.emit('error', err)
      : self.emit('complete', 'Response filters downloaded.');
  });
};

/**
 * Upload filters to OCC
 *
 * @param {Object} options command options
 */
ResponseFilter.prototype.upload = function(filterId, options) {
  var self = this;
  _upload.call(self, filterId, options, function(err) {
    err
      ? self.emit('error', err)
      : self.emit('complete', util.format('Filter %s uploaded.', filterId));
  });
};

/**
 * Delete filters from OCC
 *
 * @param {Object} options command options
 */
ResponseFilter.prototype.delete = function(filterId, options) {
  var self = this;
  _delete.call(self, filterId, options, function(err) {
    err
      ? self.emit('error', err)
      : self.emit('complete', util.format('Filter %s deleted.', filterId));
  });
};

module.exports = ResponseFilter;
