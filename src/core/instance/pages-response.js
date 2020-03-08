const fs = require('fs-extra');
const winston = require('winston');
const util = require('util');
const path = require('path');
const url = require('url');
const request = util.promisify(require('request'));
const config = require('../config');

// const auth = `${configs.application.HTTPAuthCredentials.user}:${configs.application.HTTPAuthCredentials.password}`
// const baseUrl = configs.application.HTTPAuth ? `https://${auth}@${configs.application.occStoreUrl}` : configs.application.occStoreUrl;

class PagesResponse {
  constructor(options, instance) {
    this.options = options;
    this.instanceOptions = instance.options;

    this.baseUrl = this.instanceOptions.domain;
    this.pagesDataEndpoints = {
      css: `${this.baseUrl}/ccstoreui/v1/pages/css/%s?occsite=siteUS`,
      global: `${this.baseUrl}/ccstoreui/v1/pages/%s?dataOnly=false&cacheableDataOnly=true&productTypesRequired=true`,
      pageContext: `${this.baseUrl}/ccstoreui/v1/pages/%s?dataOnly=false&currentDataOnly=true`,
      layout: `${this.baseUrl}/ccstoreui/v1/pages/layout/%s?ccvp=lg`,
    };

    this.apiPath = config.dir.instanceDefinitions.oracleApi;
    this.responsesPath = path.join(this.apiPath, 'responses');
    this.pagesPath = path.join(this.responsesPath, 'getPage');
    this.layoutsPath = path.join(this.responsesPath, 'getLayout');
    this.cssPathForLayouts = path.join(this.responsesPath, 'getCssPathForLayout');
  }

  grab() {
    return new Promise(async (resolve, reject) => {
      winston.info(`Getting main page global data from ${this.baseUrl}...\n`);

      try {
        let globalPageData = await request(util.format(this.pagesDataEndpoints.global, 'home'));
        globalPageData = JSON.parse(globalPageData.body);

        const links = globalPageData.data.global.links;

        await fs.ensureDir(this.responsesPath);
        await fs.ensureDir(this.pagesPath);
        await fs.ensureDir(this.layoutsPath);
        await fs.ensureDir(this.cssPathForLayouts);

        const responseDescriptor = {
          "request": {
            "queryParameters": {},
            "method": "get",
            "headers": {},
            "body": {}
          },
          "response": {
            "dataPath": "data.json",
            "statusCode": "200",
            "headers": {
              "content-type": "application/json"
            }
          }
        };

        for(const linkKey of Object.keys(links)) {
          const linkObject = links[linkKey];
          const allPaths = {
            page: path.join(this.pagesPath, linkObject.pageType, linkObject.repositoryId),
            layout: path.join(this.layoutsPath, linkObject.pageType, linkObject.repositoryId),
            css: path.join(this.cssPathForLayouts, linkObject.pageType, linkObject.repositoryId),
            global: path.join(this.pagesPath, linkObject.pageType, linkObject.repositoryId),
            pageContext: path.join(this.pagesPath, linkObject.pageType, linkObject.repositoryId)
          };

          await fs.ensureDir(allPaths.page);
          await fs.ensureDir(allPaths.layout);
          await fs.ensureDir(allPaths.css);

          for(const pageDataType of Object.keys(this.pagesDataEndpoints)) {
            const currentPath = allPaths[pageDataType];
            const normalizedRoute = linkObject.route.replace(/^\/{1}/, '');
            const dataTypeEndpoint = util.format(this.pagesDataEndpoints[pageDataType], normalizedRoute);

            winston.info(`${linkObject.name} - ${pageDataType}`);
            const dataTypePath = path.join(currentPath, pageDataType);
            const dataTypeQueryParameters = url.parse(dataTypeEndpoint, true).query;
            await fs.ensureDir(dataTypePath);

            winston.info(`Getting data from ${dataTypeEndpoint}...`);
            const routeResponse = await request(dataTypeEndpoint);
            const parseBody = pageDataType === 'css' ? routeResponse.body : JSON.parse(routeResponse.body);
            const isBodyString = typeof parseBody === 'string';

            // Don't keep any widgets, we are going to mock this
            if(!isBodyString && parseBody.hasOwnProperty('regions')) {
              parseBody.regions.forEach(region => {
                region.widgets = [];
              });
            }

            // Don't keep information about resolution on layouts, it will force us to generate one layout for each resolution
            // we should mock this when necessary
            if(pageDataType === 'layout' && dataTypeQueryParameters['ccvp']) {
              delete dataTypeQueryParameters['ccvp'];
            }

            responseDescriptor.request.queryParameters = dataTypeQueryParameters;
            responseDescriptor.request.queryParameters[':path'] = normalizedRoute;
            const descriptorPath = `${dataTypePath}/descriptor.json`;
            const dataPath = `${dataTypePath}/data.json`;

            fs.outputJSON(descriptorPath, responseDescriptor, { spaces: 2 });
            winston.info(`Descriptor has been saved at ${descriptorPath}...`);

            if(!isBodyString) {
              fs.outputJSON(dataPath, parseBody, { spaces: 2 });
            } else {
              fs.outputFile(dataPath, parseBody, { spaces: 2 });
            }

            winston.info(`Data has been saved at ${dataPath}...\n\n`);
          }
        }

        winston.info('Done!');
        resolve();
      } catch(error) {
        reject(error);
      }
    });
  }
}

module.exports = async function(action, options, callback) {
  const pagesResponse = new PagesResponse(options, this);

  try {
    switch(action) {
      case 'grab':
        callback(null, await pagesResponse.grab());
        break;
      default:
        callback();
    }
  } catch(errorResponse) {
    winston.error(errorResponse);
    callback(errorResponse);
  }
};
