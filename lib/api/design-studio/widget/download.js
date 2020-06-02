const { join } = require("path");
const { URL } = require("url");
const { outputFile, outputJson, remove, move, readdir } = require("fs-extra");
const { saveReadStreamIntoFile, unzipFile } = require("../../../utils/fs");

async function downloadWidgetJsFiles(occClient, widgetId, destinationFolder) {
  const { jsFiles } = await occClient.getWidgetDescriptorJavascriptInfoById(widgetId);
  await Promise.all(jsFiles.map(async (jsFile) => downloadWidgetJsFile(occClient, jsFile, destinationFolder)));
}

async function downloadWidgetJsFile(occClient, jsFile, destinationFolder) {
  const fileContents = await occClient.doGenericRequest(new URL(jsFile.url).pathname, { responseType: "stream" });
  await saveReadStreamIntoFile(fileContents, join(destinationFolder, "js", jsFile.name));
}

async function downloadWidgetTemplate(occClient, widgetId, destinationFolder, options = {}) {
  let fileContents = null;

  if (options.widgetInstanceId) {
    const data = await occClient.getWidgetSourceCode(options.widgetInstanceId);
    fileContents = data.source;
  } else {
    const data = await occClient.getWidgetDescriptorBaseTemplate(widgetId);
    fileContents = data.source;
  }

  await outputFile(join(destinationFolder, "templates", "display.template"), fileContents);
}

async function downloadWidgetLess(occClient, widgetId, destinationFolder, options = {}) {
  let fileContents = null;

  if (options.widgetInstanceId) {
    const data = await occClient.getWidgetLess(options.widgetInstanceId);
    fileContents = data.source;
  } else {
    const data = await occClient.getWidgetDescriptorBaseLess(widgetId);
    fileContents = data.source;
  }

  await outputFile(join(destinationFolder, "less", "widget.less"), fileContents);
}

const DESCRIPTOR_FIELDS = ["global", "i18nresources", "javascript", "jsEditable", "widgetType", "version", "source"];

async function downloadWidgetMetadata(occClient, widgetId, destinationFolder) {
  let fileContents = null;

  const descriptor = await occClient.getWidgetDescriptorById(widgetId, {
    options: { fields: DESCRIPTOR_FIELDS.join(",") },
  });
  const response = await occClient.getWidgetDescriptorMetadata(widgetId);

  fileContents = Object.assign({}, descriptor, response.metadata);

  if (!fileContents.translations) {
    fileContents.name = fileContents.displayName;
  }

  fileContents.config = {};
  delete fileContents.links;
  delete fileContents.source;

  await outputJson(join(destinationFolder, "widget.json"), fileContents, {
    spaces: 2,
  });
}

async function downloadWidgetConfig(occClient, widgetId, destinationFolder) {
  const { metadata: fileContents } = await occClient.getConfigMetadataForWidgetDescriptor(widgetId);
  await outputJson(join(destinationFolder, "config", "config.json"), fileContents, { spaces: 2 });
}

async function downloadWidgetConfigLocales(occClient, widgetId, destinationFolder, options = {}) {
  let languages = options.languages;

  // I didn't find any info on the widget endpoints about the locales a widget might be using, so
  // here I'm basically trying to fetch the file for every supported locale on OCC.
  if (!languages) {
    const response = await occClient.listLocales({
      options: { fields: "name" },
    });
    languages = response.items.map((i) => i.name);
  }

  await Promise.all(
    languages.map(async (language) => {
      try {
        const { localeData: fileContents } = await occClient.getConfigLocaleContentForWidgetDescriptor(
          widgetId,
          language,
          { assetLanguage: language }
        );

        await outputJson(join(destinationFolder, "config", "locales", `${language}.json`), fileContents, { spaces: 2 });
      } catch {}
    })
  );
}

async function downloadWidgetLocales(occClient, widgetId, i18nResourceName, destinationFolder, options = {}) {
  let fileContents = null;
  let languages = options.languages;

  // I didn't find any info on the widget endpoints about the locales a widget might be using, so
  // here I'm basically trying to fetch the file for every supported locale on OCC.
  if (!languages) {
    const response = await occClient.listLocales({
      options: { fields: "name" },
    });
    languages = response.items.map((i) => i.name);
  }

  await Promise.all(
    languages.map(async (language) => {
      try {
        if (options.widgetInstanceId) {
          const data = await occClient.getWidgetLocaleContent(options.widgetInstanceId, {
            assetLanguage: language,
          });
          fileContents = data.source;
        } else {
          const response = await occClient.getWidgetDescriptorBaseLocaleContent(widgetId, language, {
            assetLanguage: language,
          });
          fileContents = response.localeData;
        }

        await outputJson(join(destinationFolder, "locales", language, `ns.${i18nResourceName}.json`), fileContents, {
          spaces: 2,
        });
      } catch {}
    })
  );
}

async function downloadWidgetFromAssetPackages(
  occClient,
  widgetType,
  widgetInstanceId,
  destinationFolder,
  options = {}
) {
  const zipFilePath = join(destinationFolder, `${widgetType}.zip`);
  const assetReadStream = await occClient.getAssetPackage(widgetInstanceId, {
    options: { type: "widget" },
    responseType: "stream",
  });
  await saveReadStreamIntoFile(assetReadStream, zipFilePath);

  if (options.unzipFile) {
    await unzipFile(zipFilePath, destinationFolder);
    const entries = await readdir(join(destinationFolder, "widget"));
    const folderName = entries.find((e) => e.startsWith(widgetType));
    await move(join(destinationFolder, "widget", folderName), join(destinationFolder, widgetType));
    await remove(zipFilePath);
    await remove(join(destinationFolder, "widget"));
    await remove(join(destinationFolder, "ext.json"));
  }
}

module.exports = {
  downloadWidgetFromAssetPackages,
  downloadWidgetConfigLocales,
  downloadWidgetMetadata,
  downloadWidgetTemplate,
  downloadWidgetLocales,
  downloadWidgetJsFiles,
  downloadWidgetJsFile,
  downloadWidgetConfig,
  downloadWidgetLess,
};
