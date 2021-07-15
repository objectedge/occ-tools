const winston = require('winston');
const fs = require('fs-extra');
const path = require('path');

const config = require('../config');
const {
  PRODUCT_TYPE_METADATA,
  PRODUCT_TYPE,
  SHOPPER_TYPE,
  SHOPPER_PROPERTIES_TO_REMOVE_DEFAULT,
  OCC_LANGUAGE_HEADER,
  HTTP_METHOD_GET,
  ORDER_TYPE,
  ITEM_TYPE,
  LOCALIZABLE_ATTRIBUTES,
  LOCALIZABLE_PRODUCT_ATTRIBUTES,
  PRODUCT_TYPE_PROPERTIES_TYPE
} = require('../utils/constants');
const { mapToArrayWithId, arrayToMapById } = require('../utils');
const { pick, omit } = require('lodash');

const formatShopperAndOrderProperties = (properties) => {
  const propertiesAsArray = mapToArrayWithId(properties);
  const mappedProperties = propertiesAsArray.map(p => pick(p, LOCALIZABLE_ATTRIBUTES));
  return arrayToMapById(mappedProperties, true);
};

const formatResponse = (type, response, locale) => {
  delete response.links;
  if (type === SHOPPER_TYPE) {
    Object.keys(response.properties).forEach(property => {
      if (SHOPPER_PROPERTIES_TO_REMOVE_DEFAULT.includes(property)) {
        delete response.properties[property].default;
      }
    });
  }

  if (locale !== config.defaultLocale) {
    response = omit(response, ['propertiesOrder']);
    switch (type) {
      case PRODUCT_TYPE:
        PRODUCT_TYPE_PROPERTIES_TYPE.forEach(property => {
          if (response[property]){
            response[property] = response[property].map(p => pick(p, LOCALIZABLE_PRODUCT_ATTRIBUTES));
          }
        });

        if (response.variants) {
          response.variants = response.variants.map(variant => {
            if (!variant.localizedValues) {
              const localizedValues = {};
              variant.values.forEach(value => localizedValues[value] = value);

              return {
                ...variant,
                localizedValues
              };
            } else {
              return variant;
            }
          });
        }
        break;
      case SHOPPER_TYPE:
        response.properties = formatShopperAndOrderProperties(response.properties);
        break;
      case ORDER_TYPE:
        response.properties = formatShopperAndOrderProperties(response.properties);
        break;
      case ITEM_TYPE:
        response.specifications = response.specifications.map(p => pick(p, LOCALIZABLE_ATTRIBUTES));
        break;
    }
  }

  return response;
};

const getType = (occ, mainType, subType, locale) => {
  winston.info(`Fetching ${mainType} type [${subType}] for [${locale}] locale...`);
  const payload = {
    api: `${mainType}Types/${subType}`,
    method: HTTP_METHOD_GET,
    headers: { [OCC_LANGUAGE_HEADER]: locale}
  };

  if (mainType === PRODUCT_TYPE && subType === PRODUCT_TYPE_METADATA) {
    payload.api = 'metadata/product';
  }

  return occ.promisedRequest(payload);
};

const downloadType = async (occ, mainType, subType) => {
  return Promise.all(config.locales.map(async locale => {
    const type = await getType(occ, mainType, subType, locale);

    storeType(mainType, subType, type, locale);
  }));
};

const storeType = (mainType, subType, response, locale) => {
  const filePath = path.join(config.dir.types_root, mainType, subType, `${subType}.${locale}.json`);
  const filteredResponse = formatResponse(mainType, response, locale);
  const content = JSON.stringify(filteredResponse, null, 2);
  fs.outputFileSync(filePath, content);
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
  storeType,
  formatResponse
});
