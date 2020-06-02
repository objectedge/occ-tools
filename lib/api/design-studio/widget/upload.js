async function uploadWidgetTemplate(occClient, widgetId, templateData, options = {}) {
  if (options.widgetInstanceId) {
    await occClient.updateWidgetSourceCode(options.widgetInstanceId, {
      data: { source: templateData },
    });
  } else {
    await occClient.updateWidgetDescriptorBaseTemplate(widgetId, {
      data: { source: templateData },
      options: { updateInstances: true },
    });
  }
}

async function uploadWidgetLess(occClient, widgetId, lessData, options = {}) {
  if (options.widgetInstanceId) {
    await occClient.updateWidgetLess(options.widgetInstanceId, {
      data: { source: lessData },
    });
  } else {
    await occClient.updateWidgetDescriptorBaseLess(widgetId, {
      data: { source: lessData },
      options: { updateInstances: true },
    });
  }
}

async function uploadWidgetLocales(occClient, widgetId, localeData, language, options = {}) {
  if (options.widgetInstanceId) {
    await occClient.updateWidgetCustomTranslationsForLocale(options.widgetInstanceId, {
      data: { localeData },
      assetLanguage: language,
    });
  } else {
    await occClient.updateWidgetDescriptorBaseLocaleContent(widgetId, language, {
      data: { localeData },
      options: { updateInstances: true },
      assetLanguage: language,
    });
  }
}

async function uploadWidgetJsFile(occClient, widgetId, jsFileName, jsFileContent) {
  await occClient.updateWidgetDescriptorJavascript(widgetId, jsFileName, {
    data: { source: jsFileContent },
  });
}

module.exports = {
  uploadWidgetLess,
  uploadWidgetLocales,
  uploadWidgetTemplate,
  uploadWidgetJsFile,
};
