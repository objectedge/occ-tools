'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var Auth = require('../auth');
var OCC = require('../occ');
var config = require('../config');

var _download = require('./download');
var _upload = require('./upload');
var _list = require('./list');

function Stack(environment, options) {
  if (!environment) {
    throw new Error('OCC environment not defined.');
  }

  EventEmitter.call(this);
  this._environment = environment;
  this._endpoint = config.endpoints[environment];
  this._auth = new Auth(environment);
  this._occ = new OCC(environment, this._auth);
  this.options = options;
}

util.inherits(Stack, EventEmitter);

/**
 * Download an stack from OCC.
 * 
 * @param  {String} stackName The stack name
 * @param  {Object} options The options
 */
Stack.prototype.download = function (stackName, options) {
  var self = this;
  _download.call(self, stackName, options, function (error) {
    error
      ? self.emit('error', error)
      : self.emit('complete', util.format('Stack %s downloaded', stackName));
  });
};

/**
 * Upload an stack to OCC.
 * 
 * @param  {String} stackName The stack name
 * @param  {Object} options The options
 */
Stack.prototype.upload = function (stackName, options) {
  var self = this;
  _upload.call(self, stackName, options, function (error) {
    error
      ? self.emit('error', error)
      : self.emit('complete', util.format('Stack %s uploaded', stackName));
  });
};

/**
 * List stacks from OCC.
 * 
 * @param  {Object} options The options
 */
Stack.prototype.list = function (options) {
  var self = this;
  _list.call(self, options, function (error) {
    error
      ? self.emit('error', error)
      : self.emit('complete', 'Stacks listed');
  });
};

module.exports = Stack;
