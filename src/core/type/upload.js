const winston = require('winston');
const fs = require('fs-extra');
const path = require('path');
const { pick, isEqual, omit } = require('lodash');

const config = require('../config');
const { getType, storeType } = require('./download');
const { compareObjects, arrayToMap } = require('../utils');

const ATTRIBUTES_NOT_ALLOWED_FOR_CREATION = ['writable', 'length', 'editableAttributes'];

const getChangedAttributes = (localProperty, remoteProperty, editableAttributes) =>{
  const changedAttributes = editableAttributes.filter(attribute => !compareObjects(localProperty[attribute], remoteProperty[attribute]));

  return pick(localProperty, changedAttributes);
};

const readJsonFile = async (mainType, subType)  => {
  const filePath = path.join(config.dir.types_root, mainType, `${subType}.json`);
  const content = await fs.readFile(filePath);

  return JSON.parse(content);
};

const getProperties = (mainType, type) => {
  if (mainType === 'shopper' || mainType === 'order') {
    return type.properties;
  } else if (mainType === 'item') {
    return arrayToMap(type.specifications, 'id');
  } else {
    return {};
  }
};

const getChangedProperties = (localProperties, remoteProperties) => {
  const remotePropertiesKeys = Object.keys(remoteProperties);
  const localPropertiesKeys = Object.keys(localProperties);

  const changedProperties = (property) => {
    if (!remotePropertiesKeys.includes(property)) {
      return true;
    } else {
      const localProperty = localProperties[property];
      const remoteProperty = remoteProperties[property];
      return !compareObjects(localProperty, remoteProperty);
    }
  };

  const properties = localPropertiesKeys.filter(changedProperties).map((propertyName) => {
    const localProperty = localProperties[propertyName];
    let newProperty = null;

    if (remotePropertiesKeys.includes(propertyName)) {
      const remoteProperty = remoteProperties[propertyName];
      const changedAttributes = getChangedAttributes(localProperty, remoteProperty, remoteProperty.editableAttributes);
      if (!compareObjects(changedAttributes, {})){
        newProperty = {
          id: propertyName,
          ...changedAttributes
        };
      }
    } else {
      newProperty = { id: propertyName, ...omit(localProperty, ATTRIBUTES_NOT_ALLOWED_FOR_CREATION) };
      if (!newProperty.uiEditorType) {
        newProperty.uiEditorType = newProperty.type;
      }
    }

    return newProperty;
  }).filter(p => p !== null);

  return properties;
};

const buildPayload = (mainType, localType, remoteType) => {

  const payload = {};
  const localProperties = getProperties(mainType, localType);
  const remoteProperties = getProperties(mainType, remoteType);

  const changedProperties = getChangedProperties(localProperties, remoteProperties);

  if (!remoteType || changedProperties.length) {
    if (mainType === 'shopper' || mainType === 'order') {
      payload.properties = arrayToMap(changedProperties, 'id');
      Object.keys(payload.properties).forEach(k => delete payload.properties[k].id);
    } else if (mainType === 'item') {
      payload.specifications = changedProperties;
    } else {
      //return {};
    }
  }

  if (mainType === 'product' && (!remoteType || localType.displayName !== remoteType.displayName)) {
    payload.displayName = localType.displayName;
  }

  if (!remoteType || !isEqual(localType.propertiesOrder, remoteType.propertiesOrder)) {
    payload.propertiesOrder = localType.propertiesOrder;
  }

  return !compareObjects(payload, {}) ? payload : null;
};

const uploadType = async (occ, mainType, subType) => {
  winston.info(`Uploading ${mainType} type [${subType}]...`);

  const remoteType = await getType(occ, mainType, subType);
  const localType = await readJsonFile(mainType, subType);

  const payload = buildPayload(mainType, localType, remoteType);

  if (payload) {
    const options = {
      api: `${mainType}Types/${subType}`,
      method: 'put',
      headers: {
        'X-CCAsset-Language': 'en',
      },
      body: payload
    };

    const response = await occ.promisedRequest(options);
    storeType(mainType, subType, response);
  } else {
    winston.warn('Local type equal to remote type, skipping update');
  }
};

const uploadTypes = (occ, mainType, subTypes) => {
  return Promise.all(subTypes.map((subType) => uploadType(occ, mainType, subType)));
};

module.exports = async (occ, mainType, subType, allowedTypes) => {
  if (!subType) {
    const subTypes = allowedTypes[mainType];
    if (mainType === 'product') {
      const productTypes = await occ.promisedRequest('productTypes');
      const typesToUpload = subTypes.concat(productTypes.items.map((t) => t.id));

      return uploadType(occ, mainType, typesToUpload);
    } else {
      return uploadTypes(occ, mainType, subTypes);
    }
  }

  return uploadType(occ, mainType, subType);
};
