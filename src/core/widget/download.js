'use strict';

const path = require('path');
const fs = require('fs-extra');
const winston = require('winston');
const _configs = require('../config');
const widgetsInfo = require('./info');
const { fetchGlobalElements, downloadWidgetElements } = require('./downloadWidgetElement');

const getWidgetPath = (settings, widgetInfo) => {
  const folder = settings && settings.dest ? settings.dest : widgetInfo.folder;
  return path.join(_configs.dir.project_root, 'widgets', folder, widgetInfo.item.widgetType);
};

/**
 * Download the widget template file.
 * @param  {Object} occ The occ request.
 * @param  {Object} widgetInfo The widget info received from OCC.
 * @param  {Object} settings   The setting object.
 */
const downloadTemplate = async (occ, widgetInfo, settings) => {
  winston.info('Downloading template for %s...', widgetInfo.item.widgetType);
  const templateDir = path.join(getWidgetPath(settings, widgetInfo), 'templates');
  const templateFilePath = path.join(templateDir, 'display.template');
  const describeCodePath =`widgets/${widgetInfo.item.instances[0].id}/code`;

  const file = await occ.promisedRequest(describeCodePath);
  winston.debug('Writing %s template in %s', widgetInfo.item.widgetType, templateDir);
  fs.outputFileSync(templateFilePath, file.source);
};

/**
 * Download the widget LESS file.
 * @param  {Object} occ The occ request.
 * @param  {Object} widgetInfo The widget info received from OCC.
 * @param  {Object} settings   The setting object.
 */
const downloadLess = async (occ, widgetInfo, settings) => {
  winston.info('Downloading LESS for %s...', widgetInfo.item.widgetType);
  const lessDir = path.join(getWidgetPath(settings, widgetInfo), 'less');
  const lessFilePath = path.join(lessDir, 'widget.less');
  const url = `widgets/${widgetInfo.item.instances[0].id}/less`;

  const file = await occ.promisedRequest(url);
  winston.debug('Writing %s LESS in %s', widgetInfo.item.widgetType, lessDir);
  fs.outputFileSync(lessFilePath, file.source);
};

/**
 * Download all widget js files.
 * @param  {Object} occ The occ request.
 * @param  {Object} widgetInfo The widget info received from OCC.
 * @param  {Object} settings   The setting object.
 */
const downloadAllJs = async (occ, widgetInfo, settings) => {
  if (widgetInfo.folder === 'oracle') return;
  winston.info('Downloading %s js files...', widgetInfo.item.widgetType);
  const describeJsPath = `widgetDescriptors/${widgetInfo.item.id}/javascript`;
  var jsPath = path.join(getWidgetPath(settings, widgetInfo), 'js');

  const data = await occ.promisedRequest(describeJsPath);
  const promises = data.jsFiles.map(async (jsFile) => {
    await fs.ensureDir(jsPath);
    const options = {
      url: jsFile.url,
      method: 'get',
      download: path.join(jsPath, jsFile.name),
    };
    return occ.promisedRequest(options);
  });
  return Promise.all(promises);
};

/**
 * Writes the widget descriptor in widget folder.
 * @param  {Object} occ The occ request.
 * @param  {Object} widgetInfo The widget info received from OCC.
 * @param  {Object} settings   The setting object.
 */
const writeDescriptor = async (occ , widgetInfo, settings) => {
  const widget = widgetInfo.item;
  winston.info('Writing %s widget.json...', widget.widgetType);
  const widgetPath = getWidgetPath(settings, widgetInfo);
  const configPath = path.join(widgetPath, 'widget.json');

  if (widgetInfo.folder != 'oracle') {
    const options = {
      api: `widgetDescriptors/${widgetInfo.item.repositoryId}/metadata`,
      method: 'get',
      headers: {
        'X-CCAsset-Language': 'en'
      }
    };
    const response = await occ.promisedRequest(options);
    const config = {
      version: widget.latestVersion,
      source: widget.source,
      global: widget.global,
      javascript: widget.entrypoint,
      i18nresources: widget.i18nresources,
      widgetFamily: widget.widgetType,
      widgetType: widget.widgetType,
      ...response.metadata,
    };

    const configContent = JSON.stringify(config, null, 2);
    fs.outputFileSync(configPath, configContent);
  } else {
    const widget = widgetInfo.item;
    const metadata = {};
    const baseKeys = ['widgetType', 'version', 'displayName'];
    baseKeys.forEach(key => {
      metadata[key] = widget[key];
    });

    metadata.elementized = !!widget.layouts.length;
    fs.outputFileSync(configPath, JSON.stringify(metadata, null, 2));
  }
};

/**
 * Download widget locales.
 * @param  {Object} occ The occ request.
 * @param  {Object} widgetInfo The widget info received from OCC.
 * @param  {Object} settings   The setting object.
 */
const downloadLocales = (occ, widgetInfo, settings) => {
  if (widgetInfo.folder === 'oracle') return;
  const widget = widgetInfo.item.widgetType;
  const widgetId =  widgetInfo.item.repositoryId;
  const localesPath = path.join(getWidgetPath(settings, widgetInfo), 'locales');
  winston.info('Downloading %s locales files...', widget);

  const promises = settings.locales.map(async (locale) => {
    const options = {
      api: `widgetDescriptors/${widgetId}/locale/${locale}`,
      method: 'get',
      headers: {
        'X-CCAsset-Language': locale,
      },
    };
    const data = await occ.promisedRequest(options);
    const localePath = path.join(localesPath, locale, `ns.${widgetInfo.item.i18nresources}.json`);

    if (!data) {
      winston.warn(`Locale ${locale} not find for widget ${widget}`);
    } else {
      const localeJson = JSON.stringify(data.localeData, null, 2);
      fs.outputFileSync(localePath, localeJson);
    }
  });

  return Promise.all(promises);
};

const downloadConfigLocales = async (occ, widget, widgetId, configPath, settings) => {
  const promises = settings.locales.map(async (locale) => {
    const options = {
      api: `widgetDescriptors/${widgetId}/metadata/config/locale/${locale}`,
      method: 'get',
      headers: {
        'X-CCAsset-Language': locale,
      },
    };
    const data = await occ.promisedRequest(options);
    const localePath = path.join(configPath, 'locales', `${locale}.json`);

    if (!data) {
      winston.warn(`Config locale ${locale} not find for widget ${widget}`);
    } else {
      const localeJson = JSON.stringify(data.localeData, null, 2);
      fs.outputFileSync(localePath, localeJson);
    }
  });

  return Promise.all(promises);
};

/**
 * Writes the widget descriptor in widget folder.
 * @param  {Object} occ The occ request.
 * @param  {Object} widgetInfo The widget info received from OCC.
 * @param  {Object} settings   The setting object.
 */
const downloadConfig = async (occ, widgetInfo, settings) => {
  if (widgetInfo.folder === 'oracle') return;
  const widget = widgetInfo.item.widgetType;
  const widgetId =  widgetInfo.item.repositoryId;
  const configUrl = `widgetDescriptors/${widgetId}/metadata/config`;
  const configPath = path.join(getWidgetPath(settings, widgetInfo), 'config');
  winston.info('Downloading config for %s...', widget);

  const response = await occ.promisedRequest(configUrl);
  fs.outputFileSync(path.join(configPath, 'config.json'), JSON.stringify(response.metadata, null, 2));

  return downloadConfigLocales(occ, widget, widgetId, configPath, settings);
};

/**
 * Download a single widget.
 * @param  {Object} widgetInfo The widget info received from OCC.
 */
const downloadWidget = (occ, widgetInfo, globalElementTags, widgetInstances, settings) => {
  winston.info('Downloading widget %s...', widgetInfo.item.widgetType);
  if (widgetInfo.item.instances.length <= 0) {
    winston.warn('No instances available for widget %s.', widgetInfo.item.widgetType);
    return;
  }

  const promises = [
    downloadTemplate(occ, widgetInfo, settings),
    downloadLess(occ, widgetInfo, settings),
    downloadAllJs(occ, widgetInfo, settings),
    writeDescriptor(occ, widgetInfo, settings),
    downloadLocales(occ, widgetInfo, settings),
    downloadConfig(occ, widgetInfo, settings),
    downloadWidgetElements(occ, widgetInfo, globalElementTags, widgetInstances, settings)
  ];

  return Promise.all(promises);
};

/**
 * Download the list of widgets passed by argument.
 * @param {Object} occ The requestor.
 * @param {Array} widgets The list of widgets info received from OCC.
 * @param {Array} globalElementTags The list global element tags
 * @param {Array} widgetInstances The list of widgets instances.
 * @param {Array} settings The settings to downlaod widget.
 */
const downloadWidgets = (occ, widgets, globalElementTags, widgetInstances, settings) => {
  const widgetsCount = widgets.length;
  const promises = widgets.map(async (widgetInfo, index) => {
    winston.info('Widget %d of %d', index+1, widgetsCount);
    return downloadWidget(occ, widgetInfo, globalElementTags, widgetInstances, settings);
  });

  return Promise.all(promises);
};

const fetchWidgetInstances = async (occ, widgets) => {
  winston.info('Fetching widget instances...');
  const instances = widgets.map(widget => widget.item.instances);
  const allInstances = [].concat.apply([], instances);
  const allInstanceIds = allInstances.map(instance => instance.repositoryId);

  const promises = allInstanceIds.map(instance => occ.promisedRequest(`widgets/${instance}`));

  return Promise.all(promises);
};

module.exports = async function (widgetId, settings, callback) {
  const self = this;

  settings.locales = settings.locales
    ? settings.locales.split(',')
    : _configs.locales;

  const fetchWidgetsInfo = () => {
    return new Promise((resolve, reject) => {
      widgetsInfo.call(self, widgetId, (error, widgetInfo) => {
        if (error) {
          reject(error);
        } else {
          resolve(widgetInfo);
        }
      });
    });
  };

  try {
    const widgets = await fetchWidgetsInfo();
    const globalElements = await fetchGlobalElements(self._occ);
    const instances = await fetchWidgetInstances(self._occ, widgets);
    await downloadWidgets(self._occ, widgets, globalElements, instances, settings);
    callback();
  } catch(error) {
    callback(error);
  }
};
