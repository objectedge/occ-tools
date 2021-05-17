'use strict';

var winston = require('winston');
var path = require('path');
var fs = require('fs-extra');

var _configs = require('../config');

function getWidgetPath(settings, widgetInfo) {
  var folder = settings && settings.dest ? settings.dest : widgetInfo.folder;
  return path.join(_configs.dir.project_root, 'widgets', folder, widgetInfo.item.widgetType);
}

const fetchGlobalElements = function (widgets, callback) {
  var self = this;
  winston.info("Fetching global elements...");

  self._occ.request("elements?globals=true", function (err, response) {
    if (err) return callback(err);

    const globalElementTags = new Set();
    response.items.forEach((element) => {
      !globalElementTags.has(element.tag) && globalElementTags.add(element.tag);
    });

    callback(null, widgets, globalElementTags);
  });
};

function canDownloadElement(elementType) {
  return !["panel", "instance"].includes(elementType);
}

const donwloadElementFile = (occ, type, widgetId, elementTag, elementsPath) => {
  winston.info(`Fetching element ${elementTag} ${type}...`);
  return new Promise((resolve, reject) => {
    const options = {
      api: `widgetDescriptors/${widgetId}/element/${elementTag}/${type}`,
      method: "get",
      headers: {
        "X-CCAsset-Language": "en",
      },
    };
    occ.request(options, (err, response) => {
      if (err) return reject(err);

      if (response) {
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
        var filePath = path.join(elementsPath, elementTag, filename);
        fs.outputFileSync(
          filePath,
          type == "metadata"
            ? processElementMetadata(response)
            : response.code[type]
        );
        resolve();
      } else {
        resolve();
      }
    });
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

function downloadWidgetElementAssets(occ, widget, element, elementsPath) {
  const promises = [];

  promises.push(
    donwloadElementFile(occ, "template", widget.id, element.tag, elementsPath)
  );

  if (widget.jsEditable) {
    promises.push(
      donwloadElementFile(
        occ,
        "javascript",
        widget.id,
        element.tag,
        elementsPath
      )
    );
    promises.push(
      donwloadElementFile(occ, "metadata", widget.id, element.tag, elementsPath)
    );
  }

  return Promise.all(promises);
}

const downloadWidgetElement = (
  occ,
  widget,
  element,
  globalElementTags,
  elementsPath
) => {
  if (!globalElementTags.has(element.tag) && canDownloadElement(element.type)) {
    return downloadWidgetElementAssets(occ, widget, element, elementsPath);
  } else {
    return;
  }
};

const downloadWidgetElements = function (
  widgetInfo,
  globalElementTags,
  widgetInstances,
  settings,
  callback
) {
  winston.info("Fetching widget elements...");

  const instances = widgetInfo.item.instances;
  const allInstances = instances.map((instance) =>
    widgetInstances.find((i) => i.instance.id === instance.id)
  );

  const elementsPath = path.join(
    getWidgetPath(settings, widgetInfo),
    "elements"
  );

  if (widgetInfo.item.editableWidget) {
    const elements = allInstances.map((instance) => instance.fragments);
    const allElements = [].concat.apply([], elements);
    const uniqueElements = {};
    allElements.forEach((element) => (uniqueElements[element.tag] = element));

    const promises = Object.keys(uniqueElements).map((key) =>
      downloadWidgetElement(
        this._occ,
        widgetInfo.item,
        uniqueElements[key],
        globalElementTags,
        elementsPath
      )
    );

    Promise.all(promises)
      .then((result) => {
        callback(null, result);
      })
      .catch((e) => callback(e));
  } else {
    return;
  }
};

module.exports = {
  fetchGlobalElements,
  downloadWidgetElements,
};
