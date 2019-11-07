'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var winston = require('winston');

var OCC = require('../occ');
var Auth = require('../auth');

var _download = require('./download');
var _uploadFile = require('../files/upload');

function Image(env) {
  EventEmitter.call(this);
  this._auth = new Auth(env || 'adminUI');
  this._occ = new OCC(env || 'adminUI', this._auth);
}

util.inherits(Image, EventEmitter);

Image.prototype.download = function(imageName) {
  var self = this;
  _download.call(this, imageName, function(err) {
    err ? self.emit('error', err) : self.emit('complete', 'Image download process completed.');
  });
};

Image.prototype.upload = function(imageName) {
  var self = this;
  winston.info('Uploading file %s', imageName);
  _uploadFile.call(this, util.format('./images/%s', imageName), util.format('/general/%s', imageName), function(err) {
    err ? self.emit('error', err) : self.emit('complete', 'Image upload process completed.');
  });
};

module.exports = Image;