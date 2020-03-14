var EventEmitter = require('events').EventEmitter;
var util = require('util');

var OCC = require('../occ');
var Auth = require('../auth');
var _layout = require('./layout');
var _widget = require('./widget');
var _libraries = require('./libraries');
var _apiSchema = require('./api-schema');
var _pagesResponse = require('./pages-response');
var _localServer = require('./local-server');

function Instance(environment, options) {
  if (!environment) {
    throw new Error('Environment not defined.');
  }

  EventEmitter.call(this);
  this._environment = environment;
  this._auth = new Auth(environment);
  this._occ = new OCC(environment, this._auth);
  this.options = options;
}

util.inherits(Instance, EventEmitter);

Instance.prototype.grabLayouts = function(options) {
  var self = this;
  _layout.call(self, 'grab-all', options, function(error) {
    if (error) {
      self.emit('error', error);
    } else {
      self.emit('complete', 'Grab Layouts Completed!');
    }
  });
};

Instance.prototype.grabWidgets = function(options) {
  var self = this;
  _widget.call(self, 'grab-all', options, function(error) {
    if (error) {
      self.emit('error', error);
    } else {
      self.emit('complete', 'Grab Widgets Completed!');
    }
  });
};

Instance.prototype.grabLibs = function(options) {
  var self = this;
  _libraries.call(self, 'grab-all', options, function(error) {
    if (error) {
      self.emit('error', error);
    } else {
      self.emit('complete', 'Grab Libraries Completed!');
    }
  });
};

Instance.prototype.grabApiSchema = function(options) {
  var self = this;
  _apiSchema.call(self, 'grab', options, function(error) {
    if (error) {
      self.emit('error', error);
    } else {
      self.emit('complete', 'Grab Api Schema Completed!');
    }
  });
};

Instance.prototype.grabPagesResponse = function(options) {
  var self = this;
  _pagesResponse.call(self, options.type, options, function(error) {
    if (error) {
      self.emit('error', error);
    } else {
      self.emit('complete', 'Grab Pages Response Completed!');
    }
  });
};

Instance.prototype.runLocalServer = function(options) {
  var self = this;

  _localServer.call(self, 'run', options, function(error) {
    if (error) {
      self.emit('error', error);
    } else {
      self.emit('complete', 'Grab Pages Response Completed!');
    }
  });
};

module.exports = Instance;
