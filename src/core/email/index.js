'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var Auth = require('../auth');
var OCC = require('../occ');
var config = require('../config');

var _trigger = require('./trigger');
var _download = require('./download');
var _upload = require('./upload');
var _list = require('./list');
var _compile = require('./compile');

function Email(environment, options) {
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

util.inherits(Email, EventEmitter);

/**
 * Trigger an email in OCC.
 * @param  {String} emailId The email ID
 * @param  {Object} options The email options
 */
Email.prototype.trigger = function(emailId, options) {
  var self = this;
  _trigger.call(self, emailId, options, function(err) {
    err
      ? self.emit('error', err)
      : self.emit('complete', 'Email ' + emailId + ' sent.');
  });
};

/**
 * Trigger an email in OCC.
 * @param  {String} emailId The email ID
 * @param  {Object} options The email options
 */
Email.prototype.compile = function(emailId, options) {
  var self = this;
  _compile.call(self, emailId, options, function(err) {
    err
      ? self.emit('error', err)
      : self.emit('complete', 'Email ' + emailId + ' sent.');
  });
};


/**
 * Download an email template from OCC.
 * @param  {String} emailId The email ID
 * @param  {Object} options The options
 */
Email.prototype.download = function(emailId, options) {
  var self = this;
  _download.call(self, emailId, options, function(err) {
    err
      ? self.emit('error', err)
      : self.emit('complete', 'Email ' + emailId + ' downloaded.');
  });
};

/**
 * Upload an email template to OCC.
 * @param  {String} emailId The email ID
 * @param  {Object} options The options
 */
Email.prototype.upload = function(emailId, options) {
  var self = this;
  _upload.call(self, emailId, options, function(err) {
    err
      ? self.emit('error', err)
      : self.emit('complete', 'Email ' + emailId + ' uploaded.');
  });
};

/**
 * List email templates from OCC.
 */
Email.prototype.list = function(options) {
  var self = this;
  _list.call(self, options, function(err) {
    err
      ? self.emit('error', err)
      : self.emit('complete', 'Emails listed');
  });
};

module.exports = Email;
