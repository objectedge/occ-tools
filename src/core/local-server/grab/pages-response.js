const fs = require('fs-extra');
const winston = require('winston');
const util = require('util');
const path = require('path');
const url = require('url');
const request = util.promisify(require('request'));
const config = require('../../config');

// const auth = `${configs.application.HTTPAuthCredentials.user}:${configs.application.HTTPAuthCredentials.password}`
// const baseUrl = configs.application.HTTPAuth ? `https://${auth}@${configs.application.occStoreUrl}` : configs.application.occStoreUrl;

class PagesResponse {
  constructor(options, instance) {
    this.options = options;
    this.instanceOptions = instance.options;

    this.baseUrl = this.instanceOptions.domain;
    this.collectionsEndpoint = `${this.baseUrl}/ccstoreui/v1/collections/rootCategory?catalogId=cloudCatalog&maxLevel=5&expand=childCategories&fields=childCategories.repositoryId,childCategories.displayName,childCategories.route,childCategories.childCategories`;

    this.pagesDataEndpoints = {
      css: `${this.baseUrl}/ccstoreui/v1/pages/css/%s?occsite=siteUS`,
      global: `${this.baseUrl}/ccstoreui/v1/pages/%s?dataOnly=false&cacheableDataOnly=true&productTypesRequired=true`,
      pageContext: `${this.baseUrl}/ccstoreui/v1/pages/%s?dataOnly=false&currentDataOnly=true`,
      layout: `${this.baseUrl}/ccstoreui/v1/pages/layout/%s?ccvp=lg`
    };

    this.apiPath = config.dir.instanceDefinitions.oracleApi;
    this.responsesPath = path.join(this.apiPath, 'responses');
    this.pagesPath = path.join(this.responsesPath, 'getPage');
    this.layoutsPath = path.join(this.responsesPath, 'getLayout');
    this.cssPathForLayouts = path.join(this.responsesPath, 'getCssPathForLayout');
  }

  getCollections() {
    const allCollections = [];
    const loopTroughCollections = childCategories => {
      for(const category of childCategories) {
        let route = category.route.split('/');
        route[1] = '*';
        route = route.join('/');

        allCollections.push({
          route,
          displayName: category.displayName,
          repositoryId: category.repositoryId
        });

        if(category.childCategories) {
          loopTroughCollections(category.childCategories);
        }
      }
    };

    return new Promise(async (resolve, reject) => {
      try {
        let rootCategory = await request(this.collectionsEndpoint);
        rootCategory = JSON.parse(this.replaceRemoteLinks(rootCategory.body));
        loopTroughCollections(rootCategory.childCategories);
        resolve(allCollections);
      } catch(error) {
        reject(error);
      }
    });
  }

  // TODO
  // move localDomain from the local-server to the instance option level
  replaceRemoteLinks(body) {
    const localDomain = this.instanceOptions.domain.replace(/:\/\//, '://local.');
    return body.replace(new RegExp(this.instanceOptions.domain, 'g'), localDomain);
  }

  all() {
    return new Promise(async (resolve, reject) => {
      winston.info(`Getting main page global data from ${this.baseUrl}...\n`);

      try {
        let globalPageData = await request(util.format(this.pagesDataEndpoints.global, 'home'));
        globalPageData = JSON.parse(this.replaceRemoteLinks(globalPageData.body));

        let allCollections = await this.getCollections();
        const links = globalPageData.data.global.links;

        for(const collection of allCollections) {
          links[collection.repositoryId] = {
            defaultPage: true,
            displayName: collection.displayName,
            indexable: true,
            sites: [],
            rules: [],
            source: null,
            pageTypeItem: { repositoryId: 'categoryPageType' },
            target: 100,
            route: collection.route,
            pageType: 'category',
            repositoryId: collection.repositoryId,
            name: collection.repositoryId,
            supportedDevices: null,
            secured: false
          }
        }

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
            routeResponse.body = this.replaceRemoteLinks(routeResponse.body);
            const parseBody = pageDataType === 'css' ? routeResponse.body : JSON.parse(routeResponse.body);
            const isBodyString = typeof parseBody === 'string';

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
      case 'all':
        callback(null, await pagesResponse.all());
        break;
      default:
        callback();
    }
  } catch(errorResponse) {
    winston.error(errorResponse);
    callback(errorResponse);
  }
};
