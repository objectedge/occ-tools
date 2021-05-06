const fs = require('fs-extra');
const path = require('path');
const OCC = require('../occ');
const Auth = require('../auth');
const libraries = require('./grab/libraries');
// const apiSchema = require('./grab/api-schema');
// const pagesResponse = require('./grab/pages-response');
// const server = require('./server');
// const models = require('./database/models');
const config = require('../config');

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
      resolve('Feature in development');
      // apiSchema.call(this, 'grab', options, error => {
      //   if(error) {
      //     return reject(error);
      //   }

      //   resolve('Grab Api Schema Completed!');
      // });
    });
  }

  grabPagesResponse(options) {
    return new Promise((resolve, reject) => {
      resolve('Feature in development');
      // pagesResponse.call(this, options.type, options, error => {
      //   if(error) {
      //     return reject(error);
      //   }

      //   resolve('Grab Pages Response Completed!');
      // });
    });
  }

  runLocalServer(options) {
    return new Promise((resolve, reject) => {
      resolve('Feature in development');
      // server.call(this, 'run', options, error => {
      //   if(error) {
      //     return reject(error);
      //   }

      //   resolve('Server Closed!');
      // });
    });
  }
}

module.exports = (environment, options = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      // if(!fs.existsSync(config.localServer.database.development.storage)) {
      //   await fs.copy(path.join(__dirname, 'database', 'schema', 'db.development.sqlite'), config.localServer.database.development.storage);
      // }

      // const [ OccEnv ] = await models.OccEnv.findOrCreate({
      //   where: { name: config.instanceId },
      //   defaults: {
      //     name: config.instanceId,
      //     remoteUrl: config.endpoints.dns,
      //     localUrl: config.endpoints.local
      //   },
      //   raw: true
      // });

      // options.occEnv = OccEnv;
      resolve(new LocalServer(environment, options));
    } catch(error) {
      reject(error);
    }
  });
};
