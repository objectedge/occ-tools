const OCC = require('../occ');
const Auth = require('../auth');
const libraries = require('./grab/libraries');
const apiSchema = require('./grab/api-schema');
const pagesResponse = require('./grab/pages-response');
const server = require('./server');

class LocalServer {
  constructor(environment, options) {
    if (!environment) {
      throw new Error('Environment not defined.');
    }

    this._environment = environment;
    this._auth = new Auth(environment);
    this._occ = new OCC(environment, this._auth);
    this.options = options;
  }

  grabLibs(options) {
    return new Promise((resolve, reject) => {
      libraries.call(this, 'grab-all', options, error => {
        if(error) {
          return reject(error);
        }

        resolve('Grab Libraries Completed!');
      });
    });
  }

  grabApiSchema(options) {
    return new Promise((resolve, reject) => {
      apiSchema.call(this, 'grab', options, error => {
        if(error) {
          return reject(error);
        }

        resolve('Grab Api Schema Completed!');
      });
    });
  }

  grabPagesResponse(options) {
    return new Promise((resolve, reject) => {
      pagesResponse.call(this, options.type, options, error => {
        if(error) {
          return reject(error);
        }

        resolve('Grab Pages Response Completed!');
      });
    });
  }

  runLocalServer(options) {
    return new Promise((resolve, reject) => {
      server.call(this, 'run', options, error => {
        if(error) {
          return reject(error);
        }

        resolve('Server Closed!');
      });
    });
  }
}

module.exports = LocalServer;
