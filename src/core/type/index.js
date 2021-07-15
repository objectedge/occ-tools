const winston = require('winston');
const Auth = require('../auth');
const OCC = require('../occ');
const config = require('../config');
const _download = require('./download');
const _upload = require('./upload');
const {
  BASE_PRODUCT_TYPE,
  BASE_SHOPPER_TYPE,
  BASE_ORDER_TYPE,
  PRODUCT_TYPE_METADATA,
  PRODUCT_TYPE,
  SHOPPER_TYPE,
  ORDER_TYPE,
  ITEM_TYPE
} = require('../utils/constants');

const allowedTypes = {
  [ORDER_TYPE]: [BASE_ORDER_TYPE],
  [SHOPPER_TYPE]: [BASE_SHOPPER_TYPE],
  [PRODUCT_TYPE]: [PRODUCT_TYPE_METADATA, BASE_PRODUCT_TYPE],
  [ITEM_TYPE]: [
    'commerceItem',
    'organization',
    'promotion',
    'gift-list',
    'organizationRequest',
    'profileRequest',
    'userSiteProperties',
    'profileAgentComment',
    'orderAgentComment',
    'loyaltyPrograms',
    'mailing',
    'contactInfo',
    'creditCard',
    'tokenizedCreditCard',
    'hardgoodShippingGroup',
    'electronicShippingGroup',
    'inStorePickupShippingGroup',
    'invoiceRequest',
    'onlinePaymentGroup',
    'physicalGiftCard',
    'customCurrencyPaymentGroup',
    'quoteInfo',
    'returnComment',
    'returnItem',
    'inStoreTakeWithShippingGroup',
    'category',
    'appeasement',
    'appeasementComment',
    'appeasementRefund',
    'externalAppeasementRefund',
    'creditCardAppeasementRefund',
    'storeCreditAppeasementRefund',
    'tokenizedCreditCardAppeasementRefund',
    'onlinePaymentGroupAppeasementRefund',
    'physicalGiftCardAppeasementRefund',
    'customCurrencyAppeasementRefund',
  ],
};

const getSubType = (mainType, subType) => {
  if (subType) {
    return subType;
  } else if (mainType == ORDER_TYPE || mainType == SHOPPER_TYPE) {
    return allowedTypes[mainType][0];
  } else {
    return null;
  }
};

function Type(environment, options) {
  if (!environment) {
    throw new Error('OCC environment not defined.');
  }

  this._environment = environment;
  this._endpoint = config.endpoints[environment];
  this._auth = new Auth(environment);
  this._occ = new OCC(environment, this._auth);
  this.options = options;
}

Type.prototype.download = async function (mainType, subType) {
  if (!this.isMainTypeAllowed(mainType)) {
    throw new Error('Type not allowed. Allowed types are order, shopper, product, item');
  }

  const isAllowed = await this.isSubTypeDownloadAllowed(mainType, subType);
  if (!isAllowed) {
    throw new Error('Sub type does not exist');
  }

  await _download(this._occ, mainType, getSubType(mainType, subType), allowedTypes);

  winston.info('Download types finished!');
};

Type.prototype.upload = async function (mainType, subType, options) {
  if (!this.isMainTypeAllowed(mainType)) {
    throw new Error('Type not allowed. Allowed types are order, shopper, product, item');
  }

  if (!this.isSubTypeUploadAllowed(mainType, subType)) {
    throw new Error('Sub type does not exist');
  }

  await _upload(this._occ, mainType, getSubType(mainType, subType), allowedTypes, options);
};

Type.prototype.isMainTypeAllowed = function (mainType) {
  return Object.keys(allowedTypes).includes(mainType);
};

Type.prototype.isSubTypeDownloadAllowed = async function (mainType, subType) {
  const type = getSubType(mainType, subType);
  if (!type) return true;

  if (mainType === PRODUCT_TYPE) {
    if (allowedTypes[mainType].includes(type)) {
      return true;
    }

    const productTypes = await this._occ.promisedRequest('productTypes');

    return !!productTypes.items.find((item) => item.id === type);
  } else {
    return allowedTypes[mainType].includes(type);
  }
};

Type.prototype.isSubTypeUploadAllowed = function (mainType, subType) {
  const type = getSubType(mainType, subType);
  if (!type || mainType == PRODUCT_TYPE) return true;

  return allowedTypes[mainType].includes(type);
};

module.exports = Type;
