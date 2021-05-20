"use strict";

const Auth = require("../auth");
const OCC = require("../occ");
const config = require("../config");
const _download = require("./download");

const allowedTypes = {
  order: ["order"],
  shopper: ["user"],
  product: ["metadata", "product"],
  item: [
    "commerceItem",
    "organization",
    "promotion",
    "gift-list",
    "organizationRequest",
    "profileRequest",
    "userSiteProperties",
    "profileAgentComment",
    "orderAgentComment",
    "loyaltyPrograms",
    "mailing",
    "contactInfo",
    "creditCard",
    "tokenizedCreditCard",
    "hardgoodShippingGroup",
    "electronicShippingGroup",
    "inStorePickupShippingGroup",
    "invoiceRequest",
    "onlinePaymentGroup",
    "physicalGiftCard",
    "customCurrencyPaymentGroup",
    "quoteInfo",
    "returnComment",
    "returnItem",
    "inStoreTakeWithShippingGroup",
    "category",
    "appeasement",
    "appeasementComment",
    "appeasementRefund",
    "externalAppeasementRefund",
    "creditCardAppeasementRefund",
    "storeCreditAppeasementRefund",
    "tokenizedCreditCardAppeasementRefund",
    "onlinePaymentGroupAppeasementRefund",
    "physicalGiftCardAppeasementRefund",
    "customCurrencyAppeasementRefund",
  ],
};

const getSubType = (mainType, subType) => {
  if (subType) {
    return subType;
  } else if (mainType == "order" || mainType == "shopper") {
    return allowedTypes[mainType][0];
  } else {
    return null;
  }
};

function Type(environment, options) {
  if (!environment) {
    throw new Error("OCC environment not defined.");
  }

  this._environment = environment;
  this._endpoint = config.endpoints[environment];
  this._auth = new Auth(environment);
  this._occ = new OCC(environment, this._auth);
  this.options = options;
}

Type.prototype.download = function (mainType, subType) {
  return _download.call(
    this,
    mainType,
    getSubType(mainType, subType),
    allowedTypes
  );
};

Type.prototype.isMainTypeAllowed = function (mainType) {
  return Object.keys(allowedTypes).includes(mainType);
};

Type.prototype.isSubTypeAllowed = function (mainType, subType) {
  const type = getSubType(mainType, subType);
  if (!type) return Promise.resolve(true);

  if (mainType == "product") {
    if (allowedTypes[mainType].includes(type)) {
      return Promise.resolve(true);
    }

    return this._occ
      .promisedRequest("productTypes")
      .then(
        (response) =>
          !!response.items.find((productType) => productType.id === type)
      );
  } else {
    return Promise.resolve(allowedTypes[mainType].includes(type));
  }
};

module.exports = Type;
