"use strict";

var fs = require("fs-extra");
var path = require("path");
var winston = require("winston");
var _config = require("../config");

const processResponse = (response) => {
  response.custom &&
    Object.keys(response.resources).forEach((outerKey) => {
      if (typeof response.resources[outerKey] === "object") {
        Object.keys(response.resources[outerKey]).forEach((innerKey) => {
          if (response.custom[innerKey])
            response.resources[outerKey][innerKey] = response.custom[innerKey];
        });
      } else {
        if (response.custom[outerKey]) {
          response.resources[outerKey] = response.custom[outerKey];
        } else {
          response.custom[outerKey] = response.resources[outerKey];
        }
      }
    });

  return JSON.stringify(response.resources, null, 2);
};

const downloadLocale = function (locale) {
  const self = this;
  winston.info(`Fetching text snippet for locale ${locale}...`);

  return new Promise((resolve, reject) => {
    self._occ
      .promisedRequest(`resources/ns.common/${locale}`)
      .then((response) => {
        var filePath = path.join(
          _config.dir.project_root,
          "text-snippets",
          locale,
          "snippets.json"
        );
        fs.outputFileSync(filePath, processResponse(response));
        resolve();
      })
      .catch((e) => reject(e));
  });
};

module.exports = function (locales, callback) {
  const self = this;
  winston.info("Fetching text snippets...");

  const localesToDownload = locales ? locales.split(',') : _config.locales;

  Promise.all(
    localesToDownload.map((locale) => downloadLocale.apply(self, [locale]))
  )
    .then(() => callback())
    .catch((e) => callback(e));
};
