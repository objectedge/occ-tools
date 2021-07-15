const winston = require('winston');

const config = require('../config');
const { arrayToMapById, constants} = require('../utils');
const { getChangedProperties } = require('./changedProperties');

const uploadProperties = async (propertySpec, type, localPropertyList, remotePropertyList, occ, options) => {
  const { api, display } = propertySpec;
  const localProperties = arrayToMapById(localPropertyList);
  const remoteProperties = arrayToMapById(remotePropertyList);

  const changedProperties = getChangedProperties(localProperties, remoteProperties);

  if (!changedProperties.length) {
    winston.info(`No ${display} to update`);
  }

  for (const property of changedProperties) {
    const { id } = property;
    const payload = {
      api,
      method: constants.HTTP_METHOD_POST,
      headers: { [constants.OCC_LANGUAGE_HEADER]: config.defaultLocale }
    };

    if (options.allowNonUnderscoreNames) {
      payload.api = `${payload.api}?=allowNonUnderscoreNames=true`;
    }

    if (remoteProperties.hasOwnProperty(id)) {
      payload.method = constants.HTTP_METHOD_PUT;
      payload.api = `${payload.api}/${id}`;
      delete property.id;

      if (options.notUploadVariantValues) {
        delete property.values;
      }

      if (!Object.keys(property).length) {
        continue;
      }

      winston.info(`Updating ${display} ${id} of product type ${type}...`);
    } else {
      winston.info(`Creating ${display} ${id} of product type ${type}...`);
      if (!property.uiEditorType) {
        property.uiEditorType = property.type;
      }
    }

    payload.body = {
      productTypeId: type === constants.PRODUCT_TYPE_METADATA ? constants.BASE_PRODUCT_TYPE : type,
      ...property
    };
    try {
      await occ.promisedRequest(payload);
    } catch (e) {
      winston.error(`Error creating ${display} ${id} of product type ${type}...`);
      winston.error(e);
    }
  }
};

const uploadShopperInputs = async (propertySpec, type, localPropertyList, remotePropertyList, occ, options) => {
  await uploadProperties(propertySpec, type, localPropertyList, remotePropertyList, occ, {});
  const localPropertiesKeys = localPropertyList.map(p => p.id);
  const remotePropertiesKeys = remotePropertyList.map(p => p.id);

  const newProperties = localPropertiesKeys.filter(property => !remotePropertiesKeys.includes(property));

  for (const property of newProperties) {
    const payload = {
      api: `productTypes/${type}/shopperInputs`,
      method: constants.HTTP_METHOD_POST,
      body: {
        id: property
      }
    };

    try {
      await occ.promisedRequest(payload);
    } catch (e) {
      winston.error(`Error adding shopper input ${property} to product type ${type}...`);
      winston.error(e);
    }
  }
};

const alternateLocaleUploader = async (propertySpec, type, localPropertyList, remotePropertyList, occ, options, locale) => {
  const { api, display } = propertySpec;
  const localProperties = arrayToMapById(localPropertyList);
  const remoteProperties = arrayToMapById(remotePropertyList);

  const changedProperties = getChangedProperties(localProperties, remoteProperties);

  if (!changedProperties.length) {
    winston.info(`No ${display} to update for [${locale}] locale`);
  }

  for (const property of changedProperties) {
    const { id } = property;

    if (property.localizedValues) {
      property.values = { ...property.localizedValues };
      delete property.localizedValues;
    }

    delete property.id;

    if (options.notUploadVariantValues) {
      delete property.values;
      delete property.localizedValues;
    }

    if (!Object.keys(property).length) {
      continue;
    }

    winston.info(`Updating ${display} ${id} of product type ${type} for [${locale}] locale...`);

    const payload = {
      api: `${api}/${id}`,
      method: constants.HTTP_METHOD_PUT,
      headers: { [constants.OCC_LANGUAGE_HEADER]: locale },
      body: {
        productTypeId: type === constants.PRODUCT_TYPE_METADATA ? constants.BASE_PRODUCT_TYPE : type,
        ...property
      }
    };

    if (options.allowNonUnderscoreNames) {
      payload.api = `${payload.api}?=allowNonUnderscoreNames=true`;
    }

    try {
      await occ.promisedRequest(payload);
    } catch (e) {
      winston.error(`Error creating ${display} ${id} of product type ${type} for [${locale}] locale...`);
      winston.error(e);
    }
  }
};

const propertiesToProcess = [
  {
    name: 'items',
    uploader: uploadProperties,
    display: 'product property',
    api: 'productProperties',
  },
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
    api: 'productVariants',
  },
  {
    name: 'skuProperties',
    uploader: uploadProperties,
    display: 'sku property',
    api: 'skuProperties',
  },
  {
    name: 'shopperInputs',
    uploader: uploadShopperInputs,
    display: 'shopper inputs',
    api: 'shopperInputs'
  }
];

module.exports = {
  propertiesToProcess,
  alternateLocaleUploader
};
