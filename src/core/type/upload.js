const winston = require('winston');
const path = require('path');
const { isEqual } = require('lodash');

const config = require('../config');
const { downloadType, getType, storeType } = require('./download');
const { getChangedProperties, getProperties } = require('./changedProperties');
const { propertiesToProcess } = require('./productProperties');
const {
  compareObjects,
  arrayToMapById,
  constants,
  readJsonFile
} = require('../utils');

/*
TODO:
- validate entries
- handle locales
- optinally, remove product properties
*/

const buildPayload = (mainType, subType, localType, remoteType) => {
  const payload = {};
  if (mainType !== constants.PRODUCT_TYPE) {
    const localProperties = getProperties(mainType, localType);
    const remoteProperties = getProperties(mainType, remoteType);

    const changedProperties = getChangedProperties(localProperties, remoteProperties, {});

    if (!remoteType || changedProperties.length) {
      if (mainType === constants.SHOPPER_TYPE || mainType === constants.ORDER_TYPE) {
        payload.properties = arrayToMapById(changedProperties);
        Object.keys(payload.properties).forEach((k) => delete payload.properties[k].id);
      } else if (mainType === constants.ITEM_TYPE) {
        payload.specifications = changedProperties;
      }
    }

    if (!remoteType || !isEqual(localType.propertiesOrder, remoteType.propertiesOrder)) {
      payload.propertiesOrder = localType.propertiesOrder;
    }
  }

  if (mainType === constants.PRODUCT_TYPE && (!remoteType || localType.displayName !== remoteType.displayName)) {
    payload.id = subType;
    payload.displayName = localType.displayName;
  }

  return !compareObjects(payload, {}) ? payload : null;
};


const uploadType = async (occ, mainType, subType, options) => {
  winston.info(`Uploading ${mainType} type [${subType}]...`);

  let remoteType = null;
  try {
    remoteType = await getType(occ, mainType, subType);
  } catch (e) {
    winston.info('Type not found on OCC, it will be created');
  }

  const localType = await readJsonFile(path.join(config.dir.types_root, mainType, `${subType}.json`));

  const body = buildPayload(mainType, subType, localType, remoteType);

  if (body) {
    const payload = {
      api: remoteType ? `${mainType}Types/${subType}` : `${mainType}Types`,
      method: remoteType ? constants.HTTP_METHOD_PUT : constants.HTTP_METHOD_PUT,
      headers: { [constants.OCC_LANGUAGE_HEADER]: config.defaultLocale },
      body
    };

    if (payload.allowNonUnderscoreNames) {
      payload.api = `${payload.api}?=allowNonUnderscoreNames=true`;
    }

    const response = await occ.promisedRequest(payload);
    if (mainType !== constants.PRODUCT_TYPE) {
      storeType(mainType, subType, response);
    }
  } else {
    winston.warn('Local type equal to remote type, skipping update');
  }

  if (mainType === constants.PRODUCT_TYPE) {
    for (const property of propertiesToProcess) {
      const { name, uploader } = property;
      if (localType[name]) {
        await uploader(property, subType, localType[name], remoteType[name], occ, options);
      }
    }

    await downloadType(occ, mainType, subType);
  }
};

const uploadTypes = (occ, mainType, subTypes, options) => {
  return Promise.all(subTypes.map((subType) => uploadType(occ, mainType, subType, options)));
};

module.exports = async (occ, mainType, subType, allowedTypes, options) => {
  if (!subType) {
    const subTypes = allowedTypes[mainType];
    if (mainType === constants.PRODUCT_TYPE) {
      const productTypes = await occ.promisedRequest('productTypes');
      const typesToUpload = subTypes.concat(productTypes.items.map((t) => t.id));

      return uploadType(occ, mainType, typesToUpload, options);
    } else {
      return uploadTypes(occ, mainType, subTypes, options);
    }
  }

  return uploadType(occ, mainType, subType, options);
};
