const fs = require('fs-extra');
const winston = require('winston');
const util = require('util');
const path = require('path');
const url = require('url');
const request = util.promisify(require('request'));
const config = require('../config');

// const auth = `${configs.application.HTTPAuthCredentials.user}:${configs.application.HTTPAuthCredentials.password}`
// const baseUrl = configs.application.HTTPAuth ? `https://${auth}@${configs.application.occStoreUrl}` : configs.application.occStoreUrl;
const baseUrl = config.endpoints.store;

const pagesDataEndpoints = {
  global: `${baseUrl}/ccstoreui/v1/pages/%s?dataOnly=false&cacheableDataOnly=true&productTypesRequired=true`,
  pageContext: `${baseUrl}/ccstoreui/v1/pages/%s?dataOnly=false&currentDataOnly=true`,
  layout: `${baseUrl}/ccstoreui/v1/pages/layout/%s?ccvp=lg`
};

const apiPath = config.dir.instanceDefinitions.api;
const responsesPath = path.join(apiPath, 'responses');
const pagesPath = path.join(responsesPath, 'getPage');
const layoutsPath = path.join(responsesPath, 'getLayout');

class PagesResponse {
  grab() {
    return new Promise(async (resolve, reject) => {
      winston.info(`Getting main page global data from ${baseUrl}...\n`);

      try {
        let globalPageData = await request(util.format(pagesDataEndpoints.global, 'home'));
        globalPageData = JSON.parse(globalPageData.body);

        const links = globalPageData.data.global.links;

        await fs.ensureDir(responsesPath);
        await fs.ensureDir(pagesPath);
        await fs.ensureDir(layoutsPath);

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
          const pagePath = path.join(pagesPath, linkObject.pageType, linkObject.repositoryId);
          const layoutPath = path.join(layoutsPath, linkObject.pageType, linkObject.repositoryId);

          await fs.ensureDir(pagePath);
          await fs.ensureDir(layoutPath);

          for(const pageDataType of Object.keys(pagesDataEndpoints)) {
            const currentPath = pageDataType === 'layout' ? layoutPath : pagePath;
            const normalizedRoute = linkObject.route.replace(/^\/{1}/, '');
            const dataTypeEndpoint = util.format(pagesDataEndpoints[pageDataType], normalizedRoute);
            const dataTypePath = path.join(currentPath, pageDataType);
            const dataTypeQueryParameters = url.parse(dataTypeEndpoint, true).query;
            await fs.ensureDir(dataTypePath);

            winston.info(`Getting data from ${util.format(dataTypeEndpoint, dataTypeEndpoint)}...`);
            const routeResponse = await request(util.format(dataTypeEndpoint, dataTypeEndpoint));
            const parseBody = JSON.parse(routeResponse.body);

            // Don't keep any widgets, we are going to mock this
            if(parseBody.hasOwnProperty('regions')) {
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
            fs.outputJSON(dataPath, parseBody, { spaces: 2 });
            winston.info(`Descriptor has been saved at ${descriptorPath}...`);
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
