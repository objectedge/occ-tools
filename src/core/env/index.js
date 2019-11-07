'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var _print = require('./print');

function Environment() {
  EventEmitter.call(this);
}

util.inherits(Environment, EventEmitter);

/**
 * Prints the current environment.
 */
Environment.prototype.printCurrent = function() {
  var self = this;
  _print.call(self, function(err) {
    err ? self.emit('error', err) : self.emit('complete');
  });
};

module.exports = Environment;