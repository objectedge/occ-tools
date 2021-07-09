const winston = require('winston');
const fs = require('fs-extra');
const path = require('path');

const config = require('../config');

const PROPERTIES_TO_REMOVE_DEFAULT = ['registrationDate', 'lastPasswordUpdate'];

const formatResponse = (mainType, response) => {
  delete response.links;
  if (mainType === 'shopper') {
    Object.keys(response.properties).forEach(property => {
      if (PROPERTIES_TO_REMOVE_DEFAULT.includes(property)) {
        delete response.properties[property].default;
      }
    });
  }

  return JSON.stringify(response, null, 2);
};

const getType = (occ, mainType, subType) => {
  winston.info(`Fetching ${mainType} type [${subType}]...`);
  let url = `${mainType}Types/${subType}`;
  if (mainType === 'product' && subType === 'metadata') {
    url = 'metadata/product';
  }

  return occ.promisedRequest(url);
};

const downloadType = async (occ, mainType, subType) => {
  const content = await getType(occ, mainType, subType);
  storeType(mainType, subType, content)
};

const storeType = (mainType, subType, content) => {
  const filePath = path.join(config.dir.types_root, mainType,`${subType}.json`);
  fs.outputFileSync(filePath, formatResponse(mainType, content));
};

const downloadTypes = (occ, mainType, subTypes) => {
  return Promise.all(subTypes.map((subType) => downloadType(occ, mainType, subType)));
};

module.exports = async (occ, mainType, subType, allowedTypes) => {
  if (!subType) {
    const subTypes = allowedTypes[mainType];
    if (mainType === 'product') {
      const productTypes = await occ.promisedRequest('productTypes');
      const typesToDownload = subTypes.concat(productTypes.items.map((t) => t.id));

      return downloadTypes(occ, mainType, typesToDownload);
    } else {
      return downloadTypes(occ, mainType, subTypes);
    }
  } else {
    return downloadType(occ, mainType, subType);
  }
};

module.exports = Object.assign(module.exports, {
  getType,
  storeType
});
