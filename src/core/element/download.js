"use strict";

var fs = require("fs-extra");
var os = require("os");
var path = require("path");
var util = require("util");
var async = require("async");
var winston = require("winston");
var _config = require("../config");

function canDownloadElement(elementType) {
  return !["panel", "instance"].includes(elementType);
}

const donwloadElementFile = (occ, type, element) => {
  winston.info(`Fetching element ${element.tag} ${type}...`);

  return new Promise((resolve, reject) => {
    const options = {
      api: `elements/${element.tag}/${type}`,
      method: "get",
      headers: {
        "X-CCAsset-Language": _config.defaultLocale,
      },
    };

    occ
      .promisedRequest(options)
      .then((response) => {
        let filename = "";
        switch (type) {
          case "javascript":
            filename = path.join("js", "element.js");
            break;
          case "template":
            filename = path.join("templates", "template.txt");
            break;
          case "metadata":
            filename = "element.json";
            break;
        }

        var filePath = path.join(
          _config.dir.project_root,
          "elements",
          element.source == 100 ? "oracle" : "objectedge",
          element.tag,
          filename
        );
        fs.outputFileSync(
          filePath,
          type == "metadata"
            ? processElementMetadata(response)
            : response.code[type]
        );
        resolve();
      })
      .catch((e) => reject(r));
  });
};

function processElementMetadata(response) {
  let metadata = Object.assign({}, response);

  [
    "source",
    "repositoryId",
    "type",
    "title",
    "global",
    "version",
    "defaultText",
  ].forEach((key) => delete metadata[key]);

  Object.keys(metadata).forEach((key) => {
    if (metadata[key] === null) {
      delete metadata[key];
    }
  });

  if (metadata.children) {
    metadata.children = metadata.children.map((child) =>
      child.tag ? child.tag : child
    );
  }

  return JSON.stringify(metadata, null, 2);
}

function downloadGlobalElementAssets(occ, element) {
  const promises = [];

  promises.push(donwloadElementFile(occ, "template", element));

  if (element.source != 100) {
    promises.push(donwloadElementFile(occ, "javascript", element));
    promises.push(donwloadElementFile(occ, "metadata", element));
  }

  return Promise.all(promises);
}

module.exports = function (elementNames, callback) {
  const self = this;
  winston.info("Fetching global elements...");

  self._occ
    .promisedRequest("elements?globals=true")
    .then((response) => {
      let elements = response.items.filter((e) => canDownloadElement(e.type));

      if (elementNames) {
        const elementTags = elementNames.split(",");
        elements = elements.filter((e) => {
          const shouldDownload = elementTags.includes(e.tag);
          if (shouldDownload) {
            const index = elementTags.indexOf(e.tag);
            elementTags.splice(index, 1);
          }

          return shouldDownload;
        });
        if (elementTags.length > 0) {
          callback(`Elements not found [${elementTags}]`);
        }
      }

      const promises = elements.map((element) =>
        downloadGlobalElementAssets(self._occ, element)
      );

      Promise.all(promises)
        .then(() => callback(null))
        .catch((e) => callback(e));
    })
    .catch((e) => callback(e));
};
