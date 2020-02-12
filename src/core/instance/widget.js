'use strict';
const path = require('path');
const fs = require('fs-extra');
const winston = require('winston');
const promisify = require('util').promisify;
const instancesConfig = require('./instances-config');
const walk = require('walkdir');
const glob = require('glob');
const occConfig = require('../config');

class Widget {
  constructor(options, coreInstance) {
    this.options = options;
    this.instancesConfig = instancesConfig();
    this.occ = coreInstance._occ;
    this.request = promisify(coreInstance._occ.request.bind(coreInstance._occ));
  }

  grabWidgets() {
    return new Promise(async (resolve, reject) => {
      try {
        const widgetsList = (await this.getAllWidgets()).items.filter(
          item => item.source === 101
        );
        const totalWidgets = widgetsList.length;
        const widgetsPath = this.instancesConfig.definitionsPaths.widgets;
        const widgetsFolder = path.join(occConfig.dir.project_root, 'widgets', 'objectedge');

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

        let widgetsPathsList = await walk.async(widgetsPath, { return_object:true })

        const summaryOutput = {
          widgets: {},
          totalWidgets: 0
        };

        const widgetsDetailsList = Object.keys(widgetsPathsList).filter(item => /\.json/.test(item));

        for(let widgetPath of widgetsDetailsList) {
          const widgetName = path.basename(path.resolve(widgetPath, '..'));
          const widgetDetail = await fs.readJSON(widgetPath);

          summaryOutput.widgets[widgetName] = summaryOutput.widgets[widgetName] || {};
          summaryOutput.widgets[widgetName].instances = summaryOutput.widgets[widgetName].instances ? summaryOutput.widgets[widgetName].instances + 1 : 1;
          summaryOutput.widgets[widgetName].version = widgetDetail.instance.version;
          summaryOutput.widgets[widgetName].hasWidgetSettings = !!widgetDetail.settings;
          summaryOutput.widgets[widgetName].hasElementSettings = widgetDetail.fragments.some(fragment => Object.keys(fragment.config).length);
        }

        summaryOutput.totalWidgets = Object.keys(summaryOutput.widgets).length;

        for(let widgetName of Object.keys(summaryOutput.widgets)) {
          try {
            const hasElement = fs.existsSync((path.join(widgetsFolder, widgetName, 'element')));
            summaryOutput.widgets[widgetName].hasElement = hasElement;
            summaryOutput.widgets[widgetName].hasJsElement = summaryOutput.widgets[widgetName].hasJsElement || false;

            await new Promise((resolve) => {
              glob(path.join(widgetsFolder, widgetName, 'element', '**', 'js'))
              .on('match', () => {
                summaryOutput.widgets[widgetName].hasJsElement = true;
                resolve();
              })
              .on('end', () => {
                resolve();
              })
            });

          } catch(error) {
            reject(error);
          }
        }

        await fs.outputJSON(path.join(this.instancesConfig.definitionsPaths.instancePath, 'summary.json'), summaryOutput, { spaces: 2 });
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

  getWidgetJSFiles(id) {
    return new Promise(async (resolve, reject) => {
      if(!id) {
        return reject('Please provide a widget id');
      }

      winston.info(`Getting widget js "${id}" files`);

      const options = {
        api: `widgetDescriptors/${id}/javascript`,
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
          message: `Error while grabbing widget js file ${id}`
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
