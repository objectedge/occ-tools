'use strict';
const path = require('path');
const fs = require('fs-extra');
const winston = require('winston');
const promisify = require('util').promisify;
const config = require('../config');

class Layout {
  constructor(options, coreInstance) {
    this.options = options;
    this.occ = coreInstance._occ;
    this.request = promisify(coreInstance._occ.request.bind(coreInstance._occ));
  }

  createLayoutInstance(pageDefinition) {
    return new Promise(async (resolve, reject) => {
      if(!pageDefinition) {
        return reject('Provide a pageDefinition json containing all pages.');
      }

      try {
        const pagesPath = path.join(config.dir.instanceDefinitions.layouts, pageDefinition.shortName);
        const pageTypeJSONFile = path.join(pagesPath, 'pageType.json');
        const pageLayoutsPath = path.join(pagesPath, 'layouts');

        winston.info(`Creating page type json file ${pageTypeJSONFile}`);
        const pageJSON = {
          shortName: pageDefinition.shortName,
          displayName: pageDefinition.displayName
        };

        await fs.outputJson(pageTypeJSONFile, pageJSON, { spaces: 2 });

        winston.info(`Creating page layout folder ${pageLayoutsPath}`);
        await fs.ensureDir(pageLayoutsPath);

        for(let pageLayout of pageDefinition.pageLayouts) {
          const layout = pageLayout.layout;
          const layoutPath = path.join(pageLayoutsPath, `${pageLayout.name}-${pageLayout.repositoryId}`);
          const pageLayoutFile = path.join(layoutPath, 'page.json');
          const layoutFile = path.join(layoutPath, 'layout.json');

          winston.info(`Creating page layout json file ${pageLayoutFile}`);
          await fs.outputJson(pageLayoutFile, pageLayout, { spaces: 2 });

          const layoutDetails = await this.getLayout(layout.repositoryId);

          winston.info(`Creating layout json file ${layoutFile}`);
          await fs.outputJson(layoutFile, layoutDetails, { spaces: 2 });
        }

        resolve();
      } catch(error) {
        reject(error);
      }
    });
  }

  getAllLayouts() {
    return new Promise(async (resolve, reject) => {
      try {
        const pages = await this.getPagesDefinitions();

        for(let page of pages.items) {
          await this.createLayoutInstance(page);
        }

        resolve();
      } catch(error) {
        reject(error);
      }
    });
  }

  getLayout(id) {
    return new Promise(async (resolve, reject) => {
      winston.info(`Getting layout ${id}`);

      const options = {
        api: `layouts/${id}/structure?x-occ-app=default`,
        method: 'get',
        headers: {
          'X-CCAsset-Language': 'en'
        }
      };

      try {
        resolve(await this.request(options));
      } catch(error) {
        reject({
          error,
          message: `Error while grabbing layout ${id}`
        });
      }
    });
  }

  getPagesDefinitions() {
    return new Promise(async (resolve, reject) => {
      winston.info('Getting pages definitions');

      const options = {
        api: 'layouts?x-occ-app=default',
        method: 'get',
        headers: {
          'X-CCAsset-Language': 'en'
        }
      };

      try {
        resolve(await this.request(options));
      } catch(error) {
        reject({
          error,
          message: 'Error while grabbing definitions'
        });
      }
    });
  }
}

module.exports = async function(action, options, callback) {
  const layout = new Layout(options, this);

  try {
    switch(action) {
      case 'grab-all':
        callback(null, await layout.getAllLayouts());
        break;
      default:
        callback();
    }
  } catch(errorResponse) {
    winston.error(errorResponse.error);
    callback(errorResponse.message);
  }
};
