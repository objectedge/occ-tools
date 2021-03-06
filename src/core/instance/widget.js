'use strict';
const path = require('path');
const fs = require('fs-extra');
const winston = require('winston');
const promisify = require('util').promisify;
const config = require('../config');

class Widget {
  constructor(options, coreInstance) {
    this.options = options;
    this.occ = coreInstance._occ;
    this.request = promisify(coreInstance._occ.request.bind(coreInstance._occ));
  }

  grabWidgets() {
    return new Promise(async (resolve, reject) => {
      try {
        const widgetsList = (await this.getAllWidgets()).items;
        const totalWidgets = widgetsList.length;
        const widgetsPath = config.dir.instanceDefinitions.widgets;

        let count = 0;
        for(let widgetDetail of widgetsList) {
          const widgetPath = path.join(widgetsPath, widgetDetail.widgetType);
          const totalInstances = widgetDetail.instances.length;

          winston.info(`Getting widget "${widgetDetail.widgetType}-${widgetDetail.id}" instance details`);
          winston.info(`Total Widget instances: ${totalInstances}`);

          for(let widgetInstanceReference of widgetDetail.instances) {
            const widgetInstanceDetails = await this.getWidgetDetails(widgetInstanceReference.id);
            await fs.outputJSON(path.join(widgetPath, `${widgetInstanceReference.id}.json`), widgetInstanceDetails, { spaces: 2 });
          }
          count++;
          winston.info(`overall process: ${(count / totalWidgets * 100).toFixed(2)}%`);
          winston.info('');
        }

        resolve();
      } catch(error) {
        reject(error);
      }
    });
  }

  getWidgetLocalesFragments(id) {
    return new Promise(async (resolve, reject) => {
      if(!id) {
        return reject('Please provide a widget id');
      }

      winston.info(`Getting widget locale "${id}" fragments`);

      const options = {
        api: `widgets/${id}/locale/en?x-occ-app=default`,
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

  getWidgetDetails(id) {
    return new Promise(async (resolve, reject) => {
      if(!id) {
        return reject('Please provide a widget id');
      }

      winston.info(`Getting widget "${id}" details`);

      const options = {
        api: `widgets/${id}`,
        method: 'get',
        headers: {
          'X-CCAsset-Language': 'en'
        }
      };

      try {
        const widgetDetails = await this.request(options);
        const widgetLocaleFragments = await this.getWidgetLocalesFragments(id);

        widgetDetails.locales = widgetLocaleFragments.localeData
        widgetDetails.fragments = widgetLocaleFragments.fragments;

        resolve(widgetDetails);
      } catch(error) {
        reject({
          error,
          message: `Error while grabbing layout ${id}`
        });
      }
    });
  }

  getAllWidgets() {
    return new Promise(async (resolve, reject) => {
      winston.info(`Grabbing all widgets`);

      const options = {
        api: `widgetDescriptors/instances`,
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
}

module.exports = async function(action, options, callback) {
  const widget = new Widget(options, this);

  try {
    switch(action) {
      case 'grab-all':
        callback(null, await widget.grabWidgets());
        break;
      default:
        callback();
    }
  } catch(errorResponse) {
    winston.error(errorResponse.error);
    callback(errorResponse.message);
  }
};
