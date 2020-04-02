const winston = require('winston');
const util = require('util');
const path = require('path');
const request = util.promisify(require('request'));
const config = require('../../config');

class PagesResponse {
  constructor(options, instance) {
    this.options = options;
    this.instanceOptions = instance.options;
    this.baseUrl = config.endpoints.local;

    this.pagesDataEndpoints = {
      css: `${this.baseUrl}/ccstoreui/v1/pages/css/%s?occsite=siteUS`,
      global: `${this.baseUrl}/ccstoreui/v1/pages/%s?dataOnly=false&cacheableDataOnly=true&productTypesRequired=true`,
      pageContext: `${this.baseUrl}/ccstoreui/v1/pages/%s?dataOnly=false&currentDataOnly=true`,
      layout: `${this.baseUrl}/ccstoreui/v1/pages/layout/%s?ccvp=lg`
    };

    this.apiPath = config.dir.instanceDefinitions.oracleApi;
    this.responsesPath = path.join(this.apiPath, 'responses');
    this.productsPath = path.join(this.responsesPath, 'getProduct');
  }

  getCollections() {
    const collectionsEndpoint = `${this.baseUrl}/ccstoreui/v1/collections/rootCategory?catalogId=cloudCatalog&maxLevel=5&expand=childCategories&fields=childCategories.repositoryId,childCategories.displayName,childCategories.route,childCategories.childCategories`;

    const syncAllCollections = childCategories => {
      return new Promise(async (resolve, reject) => {
        try {
          for(const category of childCategories) {
            winston.info(`Syncing collection ${category.id}...`);
            await request({
              uri: `${this.baseUrl}/ccstoreui/v1/collections/${category.id}`,
              rejectUnauthorized: false,
              gzip: true,
              method: 'GET'
            });

            if(category.childCategories) {
              resolve(syncAllCollections(category.childCategories));
            } else {
              resolve();
            }
          }
        } catch(error) {
          reject(error);
        }
      });
    };

    return new Promise(async (resolve, reject) => {
      try {
        let rootCategory = await request({
          uri: collectionsEndpoint,
          rejectUnauthorized: false,
          gzip: true,
          method: 'GET'
        });
        rootCategory = JSON.parse(this.replaceRemoteLinks(rootCategory.body));
        await syncAllCollections(rootCategory.childCategories);
        resolve();
      } catch(error) {
        reject(error);
      }
    });
  }

  getAllProducts() {
    const limit = 250;
    const productsEndpoint = `${this.baseUrl}/ccstoreui/v1/products?totalResults=true&totalExpandedResults=true&includeChildren=true&limit=${limit}&offset=%s&fields=id`;
    const productsEndpointTotal = `${config.endpoints.dns}/ccstoreui/v1/products?totalResults=true&totalExpandedResults=true&includeChildren=true&limit=1&fields=totalResults`;

    let offset = 0;
    let page = 1;
    let totalResults = 0;

    const syncProductsPerPage = offset => {
      return new Promise(async(resolve, reject) => {
        try {
          winston.info(`Syncing ${limit} products from page ${page} starting from item ${offset}`);
          let productsResponse = await request({
            uri: util.format(productsEndpoint, offset),
            rejectUnauthorized: false,
            gzip: true,
            method: 'GET'
          });

          const body = JSON.parse(productsResponse.body);

          page++;
          offset = limit * page;
          if(offset > body.totalResults) {
            resolve();
          } else {
            resolve(syncProductsPerPage(offset));
          }
        } catch(error) {
          reject(error.message);
        }
      });
    };

    return new Promise(async (resolve, reject) => {
      try {
        const totalResultsResponse = await request({
          uri: productsEndpointTotal,
          rejectUnauthorized: false,
          gzip: true,
          method: 'GET'
        });
        const body = JSON.parse(totalResultsResponse.body);
        totalResults = body.totalResults;

        winston.info(`Syncing ${totalResults} products...`);
        await syncProductsPerPage(offset);
        resolve();
      } catch(error) {
        reject(error);
      }
    });
  }

  replaceRemoteLinks(body) {
    return body.replace(new RegExp(config.endpoints.dns, 'g'), config.endpoints.local);
  }

  syncCatalog() {
    return new Promise(async (resolve, reject) => {
      winston.info('Syncing catalog...');
      try {
        await this.getCollections();
        await this.getAllProducts();
        resolve();
      } catch(error) {
        reject(error);
      }
    })
  }

  basicSchema() {
    return new Promise(async (resolve, reject) => {
      winston.info(`Getting main page global data from ${this.baseUrl}...\n`);

      try {
        let globalPageData = await request({
          uri: util.format(this.pagesDataEndpoints.global, 'home'),
          rejectUnauthorized: false,
          gzip: true,
          method: 'GET'
        });

        globalPageData = JSON.parse(this.replaceRemoteLinks(globalPageData.body));
        const links = globalPageData.data.global.links;

        for(const linkKey of Object.keys(links)) {
          const linkObject = links[linkKey];

          for(const pageDataType of Object.keys(this.pagesDataEndpoints)) {
            const normalizedRoute = linkObject.route.replace(/^\/{1}/, '');
            const dataTypeEndpoint = util.format(this.pagesDataEndpoints[pageDataType], normalizedRoute);

            winston.info(`${linkObject.name} - ${pageDataType}`);
            winston.info(`Getting data from ${dataTypeEndpoint}...`);
            await request({
              uri: dataTypeEndpoint,
              rejectUnauthorized: false,
              gzip: true,
              method: 'GET'
            });
          }
        }

        winston.info('Done!');
        resolve();
      } catch(error) {
        reject(error.message);
      }
    });
  }
}

module.exports = async function(action, options, callback) {
  const pagesResponse = new PagesResponse(options, this);

  try {
    switch(action) {
      case 'schema':
        callback(null, await pagesResponse.basicSchema());
        break;
      case 'catalog':
        callback(null, await pagesResponse.syncCatalog());
        break;
      default:
        callback();
    }
  } catch(errorResponse) {
    winston.error(errorResponse);
    callback(errorResponse);
  }
};
