var EventEmitter = require('events').EventEmitter;
var util = require('util');

var OCC = require('../occ');
var Auth = require('../auth');

var _run = require('./run');
var _generate = require('./generate');

function Deploy(environment, options) {
  if (!environment) {
    throw new Error('Environment not defined.');
  }

  EventEmitter.call(this);
  this._environment = environment;
  this._auth = new Auth(environment);
  this._occ = new OCC(environment, this._auth);
  this.options = options;
}

util.inherits(Deploy, EventEmitter);

Deploy.prototype.run = function(deployInstructions) {
  var self = this;
  _run.call(self, deployInstructions, function(error) {
    if (error) {
      self.emit('error', error);
    } else {
      self.emit('complete', 'Deploy script completed');
    }
  });
};

Deploy.prototype.generate = function(revision, options) {
  var self = this;
  _generate.call(self, revision, options, function(error) {
    if (error) {
      self.emit('error', error);
    } else {
      self.emit('complete', 'Deploy script generated!');
    }
  });
};

module.exports = Deploy;
