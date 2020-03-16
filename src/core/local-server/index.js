const EventEmitter = require('events').EventEmitter;
const util = require('util');

const OCC = require('../occ');
const Auth = require('../auth');
const libraries = require('./grab/libraries');
const apiSchema = require('./grab/api-schema');
const pagesResponse = require('./grab/pages-response');
const server = require('./server');

class LocalServer extends EventEmitter {
  constructor(environment, options) {
    super();

    if (!environment) {
      throw new Error('Environment not defined.');
    }

    this._environment = environment;
    this._auth = new Auth(environment);
    this._occ = new OCC(environment, this._auth);
    this.options = options;
  }

  grabLibs(options) {
    var self = this;
    libraries.call(self, 'grab-all', options, function(error) {
      if (error) {
        self.emit('error', error);
      } else {
        self.emit('complete', 'Grab Libraries Completed!');
      }
    });
  }

  grabApiSchema(options) {
    var self = this;
    apiSchema.call(self, 'grab', options, function(error) {
      if (error) {
        self.emit('error', error);
      } else {
        self.emit('complete', 'Grab Api Schema Completed!');
      }
    });
  }

  grabPagesResponse(options) {
    var self = this;
    pagesResponse.call(self, options.type, options, function(error) {
      if (error) {
        self.emit('error', error);
      } else {
        self.emit('complete', 'Grab Pages Response Completed!');
      }
    });
  }

  runLocalServer(options) {
    var self = this;

    server.call(self, 'run', options, function(error) {
      if (error) {
        self.emit('error', error);
      } else {
        self.emit('complete', 'Grab Pages Response Completed!');
      }
    });
  }
}

module.exports = LocalServer;
