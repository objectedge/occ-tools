'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var OCC = require('../occ');
var Auth = require('../auth');

var _upload = require('./upload');
var _download = require('./download');
var _list = require('./list');
var _delete = require('./delete');
var _generate = require('./generate');
var _restart = require('./restart');
var _downloadLogs = require('./download-logs');
var _listVariables = require('./list-variables');
var _deleteVariable = require('./delete-variable');
var _downloadVariables = require('./download-variables');
var _uploadVariables = require('./upload-variables');

function ServerSideExtension(environment, options) {
  if (!environment) {
    throw new Error('Environment not defined.');
  }

  EventEmitter.call(this);
  this._environment = environment;
  this._auth = new Auth(environment);
  this._occ = new OCC(environment, this._auth);
  this.options = options;
}

util.inherits(ServerSideExtension, EventEmitter);

ServerSideExtension.prototype.upload = function(name) {
  var self = this;
  _upload.call(self, name, function(error) {
    if (error) {
      self.emit('error', error);
    } else {
      self.emit('complete', 'Server-side extension upload completed.');
    }
  });
};

ServerSideExtension.prototype.download = function(name, options) {
  var self = this;
  _download.call(self, name, options, function(error) {
    if (error) {
      self.emit('error', error);
    } else {
      self.emit('complete', 'Server-side extension download completed.');
    }
  });
};

ServerSideExtension.prototype.list = function() {
  var self = this;
  _list.call(self, function(error) {
    if (error) {
      self.emit('error', error);
    } else {
      self.emit('complete', 'Server-side extensions listed.');
    }
  });
};

ServerSideExtension.prototype.delete = function(name) {
  var self = this;
  _delete.call(self, name, function(error) {
    if (error) {
      self.emit('error', error);
    } else {
      self.emit('complete', 'Server-side extension deletion completed.');
    }
  });
};

ServerSideExtension.prototype.generate = function(name, options) {
  var self = this;
  _generate.call(self, name, options, function(error) {
    if (error) {
      self.emit('error', error);
    } else {
      self.emit('complete', 'Server-side extension creation completed.');
    }
  });
};

ServerSideExtension.prototype.restart = function() {
  var self = this;
  _restart.call(self, function(error) {
    if (error) {
      self.emit('error', error);
    } else {
      self.emit('complete', 'Server-side extension server restarted.');
    }
  });
};

ServerSideExtension.prototype.downloadLogs = function(name, options) {
  var self = this;
  _downloadLogs.call(self, name, options, function(error) {
    if (error) {
      self.emit('error', error);
    } else {
      self.emit('complete', 'Server-side extension logs downloaded.');
    }
  });
};

ServerSideExtension.prototype.listVariables = function() {
  var self = this;
  _listVariables.call(self, function(error) {
    if (error) {
      self.emit('error', error);
    } else {
      self.emit('complete', 'Server-side extension variables listed.');
    }
  });
};

ServerSideExtension.prototype.deleteVariable = function(name) {
  var self = this;
  _deleteVariable.call(self, name, function(error) {
    if (error) {
      self.emit('error', error);
    } else {
      self.emit('complete', 'Server-side extension variable deletion completed.');
    }
  });
};

ServerSideExtension.prototype.downloadVariables = function(options) {
  var self = this;
  _downloadVariables.call(self, options, function(error) {
    if (error) {
      self.emit('error', error);
    } else {
      self.emit('complete', 'Server-side extension variables download completed.');
    }
  });
};

ServerSideExtension.prototype.uploadVariables = function(variableName, options) {
  var self = this;
  _uploadVariables.call(self, variableName, options, function(error) {
    if (error) {
      self.emit('error', error);
    } else {
      self.emit('complete', 'Server-side extension variables upload completed.');
    }
  });
};

module.exports = ServerSideExtension;
