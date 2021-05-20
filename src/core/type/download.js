const winston = require("winston");
const fs = require("fs-extra");
const path = require("path");

const _config = require("../config");

const formatResponse = (response) => {
  delete response.links;
  return JSON.stringify(response, null, 2);
};

const downloadSubType = function (mainType, subType) {
  winston.info(`Fetching ${mainType} type [${subType}]...`);
  return new Promise((resolve, reject) => {
    let url = `${mainType}Types/${subType}`;
    if (mainType === "product" && subType === "metadata") {
      url = "metadata/product";
    }
    this._occ
      .promisedRequest(url)
      .then((response) => {
        var filePath = path.join(
          _config.dir.types_root,
          mainType,
          `${subType}.json`
        );
        fs.outputFileSync(filePath, formatResponse(response));
        resolve();
      })
      .catch(reject);
  });
};

const downloadSubTypes = function (mainType, subTypes) {
  const downloadOne = downloadSubType.bind(this);

  return Promise.all(subTypes.map((subType) => downloadOne(mainType, subType)));
};

module.exports = function (mainType, subType, allowedTypes) {
  const downloadOne = downloadSubType.bind(this);
  const downloadAll = downloadSubTypes.bind(this);

  if (!subType) {
    const subTypes = allowedTypes[mainType];
    if (mainType === "product") {
      return this._occ
        .promisedRequest("productTypes")
        .then((response) =>
          downloadAll(
            mainType,
            subTypes.concat(response.items.map((t) => t.id))
          )
        );
    } else {
      return downloadAll(mainType, subTypes);
    }
  }

  return downloadOne(mainType, subType);
};
