const winston = require('winston');
const fs = require('fs-extra');
const path = require('path');

const config = require('../config');
const {
  PRODUCT_TYPE_METADATA,
  PRODUCT_TYPE,
  SHOPPER_TYPE,
  SHOPPER_PROPERTIES_TO_REMOVE_DEFAULT,
} = require('../utils/constants');

const formatResponse = (mainType, response) => {
  delete response.links;
  if (mainType === SHOPPER_TYPE) {
    Object.keys(response.properties).forEach(property => {
      if (SHOPPER_PROPERTIES_TO_REMOVE_DEFAULT.includes(property)) {
        delete response.properties[property].default;
      }
    });
  }

  return JSON.stringify(response, null, 2);
};

const getType = (occ, mainType, subType) => {
  winston.info(`Fetching ${mainType} type [${subType}]...`);
  let url = `${mainType}Types/${subType}`;
  if (mainType === PRODUCT_TYPE && subType === PRODUCT_TYPE_METADATA) {
    url = 'metadata/product';
  }

  return occ.promisedRequest(url);
};

const downloadType = async (occ, mainType, subType) => {
  const content = await getType(occ, mainType, subType);
  storeType(mainType, subType, content);
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
    if (mainType === PRODUCT_TYPE) {
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
  downloadType,
  getType,
  storeType
});
