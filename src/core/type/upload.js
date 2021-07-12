const winston = require('winston');
const fs = require('fs-extra');
const path = require('path');
const { pick, isEqual, omit } = require('lodash');

const config = require('../config');
const { downloadType, getType, storeType } = require('./download');
const { compareObjects, arrayToMap } = require('../utils');

/*
TODO:
- handle locales
- upload shopper inputs
- remove product properties
- option to not upload values on variants
*/

const ATTRIBUTES_NOT_ALLOWED_FOR_CREATION = [
  'writable',
  'length',
  'editableAttributes',
];

const getChangedAttributes = (
  localProperty,
  remoteProperty,
  editableAttributes
) => {
  const changedAttributes = editableAttributes.filter(
    (attribute) =>
      !compareObjects(localProperty[attribute], remoteProperty[attribute])
  );

  return pick(localProperty, changedAttributes);
};

const readJsonFile = async (mainType, subType) => {
  const filePath = path.join(
    config.dir.types_root,
    mainType,
    `${subType}.json`
  );
  const content = await fs.readFile(filePath);

  return JSON.parse(content);
};

const getProperties = (mainType, type) => {
  if (mainType === 'shopper' || mainType === 'order') {
    return type.properties;
  } else if (mainType === 'item') {
    return arrayToMap(type.specifications, 'id');
  }

  return null;
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

  const properties = localPropertiesKeys
    .filter(changedProperties)
    .map((propertyName) => {
      const localProperty = localProperties[propertyName];
      let newProperty = null;

      if (remotePropertiesKeys.includes(propertyName)) {
        const remoteProperty = remoteProperties[propertyName];
        const changedAttributes = getChangedAttributes(
          localProperty,
          remoteProperty,
          remoteProperty.editableAttributes
        );
        if (!compareObjects(changedAttributes, {})) {
          newProperty = {
            id: propertyName,
            ...changedAttributes,
          };
        }
      } else {
        newProperty = {
          id: propertyName,
          ...omit(localProperty, ATTRIBUTES_NOT_ALLOWED_FOR_CREATION),
        };
        if (!newProperty.uiEditorType) {
          newProperty.uiEditorType = newProperty.type;
        }
      }

      return newProperty;
    })
    .filter((p) => p !== null);

  return properties;
};

const buildPayload = (mainType, subType, localType, remoteType) => {
  const payload = {};
  if (mainType !== 'product') {
    const localProperties = getProperties(mainType, localType);
    const remoteProperties = getProperties(mainType, remoteType);

    const changedProperties = getChangedProperties(
      localProperties,
      remoteProperties
    );

    if (!remoteType || changedProperties.length) {
      if (mainType === 'shopper' || mainType === 'order') {
        payload.properties = arrayToMap(changedProperties, 'id');
        Object.keys(payload.properties).forEach(
          (k) => delete payload.properties[k].id
        );
      } else if (mainType === 'item') {
        payload.specifications = changedProperties;
      }
    }

    if (
      !remoteType ||
      !isEqual(localType.propertiesOrder, remoteType.propertiesOrder)
    ) {
      payload.propertiesOrder = localType.propertiesOrder;
    }
  }

  if (
    mainType === 'product' &&
    (!remoteType || localType.displayName !== remoteType.displayName)
  ) {
    payload.id = subType;
    payload.displayName = localType.displayName;
  }

  return !compareObjects(payload, {}) ? payload : null;
};

const uploadProperties = async (propertySpec, type, localVariants, remoteVariants, occ) => {
  const { api, display } = propertySpec;
  const localProperties = arrayToMap(localVariants, 'id');
  const remoteProperties = arrayToMap(remoteVariants, 'id');

  const changedProperties = getChangedProperties(
    localProperties,
    remoteProperties
  );

  if (!changedProperties.length) {
    winston.info(`No ${display} to update`);
  }

  for (const property of changedProperties) {
    const options = {
      api,
      method: 'post',
      headers: {'X-CCAsset-Language': 'en'},
    };

    property.productTypeId = type;
    if (remoteProperties.hasOwnProperty(property.id)) {
      winston.info(`Updating ${display} ${property.id} of product type ${type}...`);
      options.method = 'put';
      options.api = `${options.api}/${property.id}`;
      delete property.id;
    } else {
      winston.info(`Creating ${display} ${property.id} of product type ${type}...`);
      if (!property.uiEditorType) {
        property.uiEditorType = property.type;
      }
      property.productTypeId = type;
    }

    options.body = { ...property };
    try {
      await occ.promisedRequest(options);
    } catch (e) {
      winston.error(`Error creating ${display} ${property.id} of product type ${type}...`);
      winston.error(e);
    }
  }
};

const propertiesToProcess = [
  {
    name: 'specifications',
    uploader: uploadProperties,
    display: 'product property',
    api: 'productProperties',
  },
  {
    name: 'variants',
    uploader: uploadProperties,
    display: 'product variant',
    api: 'skuProperties',
  },
  {
    name: 'skuProperties',
    uploader: uploadProperties,
    display: 'sku property',
    api: 'productVariants',
  },
];

const uploadType = async (occ, mainType, subType) => {
  winston.info(`Uploading ${mainType} type [${subType}]...`);

  let remoteType = null;
  try {
    remoteType = await getType(occ, mainType, subType);
  } catch (e) {
    winston.info('Type not found on OCC, it will be created');
  }

  const localType = await readJsonFile(mainType, subType);

  const payload = buildPayload(mainType, subType, localType, remoteType);

  if (payload) {
    const options = {
      api: remoteType ? `${mainType}Types/${subType}` : `${mainType}Types`,
      method: remoteType ? 'put' : 'post',
      headers: {
        'X-CCAsset-Language': 'en',
      },
      body: payload,
    };

    const response = await occ.promisedRequest(options);
    if (mainType !== 'product') {
      storeType(mainType, subType, response);
    }
  } else {
    winston.warn('Local type equal to remote type, skipping update');
  }

  if (mainType === 'product') {
    for (const property of propertiesToProcess) {
      const { name, uploader } = property;
      if (localType[name]) {
        await uploader(property, subType, localType[name], remoteType[name], occ);
      }
    }
    await downloadType(occ, mainType, subType);
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
