'use strict';

var winston = require('winston');
var path = require('path');
var fs = require('fs-extra');

var _configs = require('../config');

function getWidgetPath(settings, widgetInfo) {
  var folder = settings && settings.dest ? settings.dest : widgetInfo.folder;
  return path.join(
    _configs.dir.project_root,
    'widgets',
    folder,
    widgetInfo.item.widgetType
  );
}

const fetchGlobalElements = async (occ) => {
  winston.info('Fetching global elements...');

  const response = await occ.promisedRequest('elements?globals=true');
  const globalElementTags = new Set();
  response.items.forEach((element) => {
    !globalElementTags.has(element.tag) && globalElementTags.add(element.tag);
  });

  return globalElementTags;
};

function canDownloadElement(elementType) {
  return !['panel', 'instance'].includes(elementType);
}

const donwloadElementFile = (occ, type, widgetId, elementTag, elementsPath) => {
  winston.info(`Fetching element ${elementTag} ${type}...`);
  return new Promise((resolve, reject) => {
    const options = {
      api: `widgetDescriptors/${widgetId}/element/${elementTag}/${type}`,
      method: 'get',
      headers: {
        'X-CCAsset-Language': _configs.defaultLocale,
      },
    };
    occ.promisedRequest(options)
      .then((response) => {
        if (!response) resolve();

        fs.outputFileSync(
          getElementPath(type, elementsPath, elementTag),
          type == 'metadata'
            ? processElementMetadata(response)
            : response.code[type]
        );
        resolve();
      })
      .catch((e) => reject(e));
  });
};

function getElementPath(type, elementsPath, elementTag) {
  let filename = '';
  switch (type) {
    case 'javascript':
      filename = path.join('js', 'element.js');
      break;
    case 'template':
      filename = path.join('templates', 'template.txt');
      break;
    case 'metadata':
      filename = 'element.json';
      break;
  }

  return path.join(elementsPath, elementTag, filename);
}

function processElementMetadata(response) {
  let metadata = Object.assign({}, response);

  [
    'source',
    'repositoryId',
    'type',
    'title',
    'global',
    'version',
    'defaultText',
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
    donwloadElementFile(occ, 'template', widget.id, element.tag, elementsPath)
  );

  if (widget.jsEditable) {
    promises.push(
      donwloadElementFile(
        occ,
        'javascript',
        widget.id,
        element.tag,
        elementsPath
      )
    );
    promises.push(
      donwloadElementFile(occ, 'metadata', widget.id, element.tag, elementsPath)
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
  occ,
  widgetInfo,
  globalElementTags,
  widgetInstances,
  settings
) {
  if (widgetInfo.folder === 'oracle') return;
  winston.info('Fetching widget elements...');

  const instances = widgetInfo.item.instances;
  const allInstances = instances.map((instance) =>
    widgetInstances.find((i) => i.instance.id === instance.id)
  );

  const elementsPath = path.join(
    getWidgetPath(settings, widgetInfo),
    'elements'
  );

  if (widgetInfo.item.editableWidget) {
    const elements = allInstances.map((instance) => instance.fragments);
    const allElements = [].concat.apply([], elements);
    const uniqueElements = {};
    allElements.forEach((element) => (uniqueElements[element.tag] = element));

    const promises = Object.keys(uniqueElements).map((key) =>
      downloadWidgetElement(
        occ,
        widgetInfo.item,
        uniqueElements[key],
        globalElementTags,
        elementsPath
      )
    );

    return Promise.all(promises);
  } else {
    return;
  }
};

module.exports = {
  fetchGlobalElements,
  downloadWidgetElements,
};
