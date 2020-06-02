const { join } = require("path");
const { readdir, exists, readFile, readJson } = require("fs-extra");

const colors = require("../../../cli/ui/theme");
const Spinner = require("../../../cli/ui/output/Spinner");
const OccApiType = require("../../../api/occ-client/OccApiType");
const TextOutput = require("../../../cli/ui/output/TextOutput");
const FolderType = require("../../../cli/project/folder-structure/FolderType");

const { UiElementSource } = require("../../../api/design-studio");
const { getWidgetDescriptor } = require("../../../api/design-studio/widget");
const { getProjectFolderPath } = require("../../../cli/project/folder-structure/paths");
const { getOccClientForCurrentEnv } = require("../../../cli/occ");
const { Command, CommandArgument, CommandOption } = require("../../../cli/command");
const {
  uploadWidgetLess,
  uploadWidgetLocales,
  uploadWidgetTemplate,
  uploadWidgetJsFile,
} = require("../../../api/design-studio/widget/upload");

async function _getAllWidgetFolders() {
  let ootbWidgets = await readdir(getProjectFolderPath(FolderType.WIDGETS_OOTB));
  let customWidgets = await readdir(getProjectFolderPath(FolderType.WIDGETS_CUSTOM));

  ootbWidgets.sort();
  customWidgets.sort();

  ootbWidgets = ootbWidgets.map((w) => join(getProjectFolderPath(FolderType.WIDGETS_OOTB), w));
  customWidgets = customWidgets.map((w) => join(getProjectFolderPath(FolderType.WIDGETS_CUSTOM), w));

  return [...ootbWidgets, ...customWidgets];
}

function _getWidgetName(descriptor) {
  if (descriptor.translations && descriptor.translations.length) {
    const enTranslation = descriptor.translations.find((t) => t.language === "en");

    if (enTranslation) {
      return enTranslation.name;
    }
  } else {
    return descriptor.name;
  }
}

async function _getFormattedWidgets(widgetPaths) {
  let formattedWidgets = [];

  await Promise.all(
    widgetPaths.map(async (widgetPath) => {
      const descriptorFile = join(widgetPath, "widget.json");

      if (await exists(descriptorFile)) {
        const descriptor = await readJson(descriptorFile);
        const name = _getWidgetName(descriptor) || "Widget";

        formattedWidgets.push({
          value: descriptor.widgetType,
          description: name,
        });
      }
    })
  );

  return formattedWidgets;
}

const ALL_UPLOAD_STEPS = [
  { value: "js", description: "Upload all JS files." },
  { value: "less", description: "Upload LESS styles." },
  { value: "template", description: "Upload template." },
  { value: "locales", description: "Upload all i18n locales." },
  { value: "elements", description: "Upload all elements." },
];

class UploadWidgetCommand extends Command {
  async execute(widgetType, uploadType, options = {}) {
    try {
      Spinner.setText("Gathering information...");
      Spinner.show();

      const occClient = await getOccClientForCurrentEnv(OccApiType.COMMERCE_ADMIN);

      if (uploadType === "extension") {
        // TODO: implement extension upload.
      } else {
        const widgetDescriptor = await getWidgetDescriptor(widgetType);
        const uploadSteps =
          (options.fileType && options.fileType.join(",")).map((o) => o.trim()) || ALL_UPLOAD_STEPS.map((s) => s.value);
        let widgetFolder = options.sourcesFolder;

        if (!widgetFolder) {
          const widgetsFolder = getProjectFolderPath(
            widgetDescriptor.source === UiElementSource.CUSTOM ? FolderType.WIDGETS_CUSTOM : FolderType.WIDGETS_OOTB
          );

          widgetFolder = join(widgetsFolder, widgetType);

          // This enables support for using the widget with bundlers like webpack.
          // In cases like this it's a common practice to have a "dist" folder
          // with the final files to upload.
          if (await exists(join(widgetFolder, "dist"))) {
            widgetFolder = join(widgetFolder, "dist");
          }
        }

        const localWidgetDescriptor = await readJson(join(widgetFolder, "widget.json"));
        Spinner.setText("Uploading files...");

        await Promise.all(
          uploadSteps.map(async (step) => {
            switch (step) {
              case "template":
                const templateFile = join(widgetFolder, "templates", "display.template");

                if (await exists(templateFile)) {
                  const templateData = await readFile(templateFile);

                  await uploadWidgetTemplate(occClient, widgetDescriptor.id, templateData, {
                    widgetInstanceId: options.widgetInstanceId,
                  });
                }

                break;
              case "less":
                const lessFile = join(widgetFolder, "less", "widget.less");

                if (await exists(lessFile)) {
                  const lessData = await readFile(lessFile);

                  await uploadWidgetLess(occClient, widgetDescriptor.id, lessData, {
                    widgetInstanceId: options.widgetInstanceId,
                  });
                }

                break;
              case "locales":
                const localesFolder = join(widgetFolder, "locales");
                const languages = await readdir(localesFolder);

                for (const language of languages) {
                  const localeFile = join(localesFolder, language, `ns.${localWidgetDescriptor.i18nresources}.json`);

                  if (await exists(localeFile)) {
                    const localeData = await readJson(localeFile);

                    await uploadWidgetLocales(occClient, widgetDescriptor.id, localeData, language, {
                      widgetInstanceId: options.widgetInstanceId,
                    });
                  }
                }

                break;
              case "js":
                const jsSourcesFolder = join(widgetFolder, "js");
                const jsFileNames = await readdir(jsSourcesFolder);

                for (const jsFileName of jsFileNames) {
                  const jsFileContent = await readFile(join(jsSourcesFolder, jsFileName));
                  await uploadWidgetJsFile(occClient, widgetDescriptor.id, jsFileName, jsFileContent);
                }

                break;
              case "elements":
                // TODO: implement
                break;
            }
          })
        );
      }

      Spinner.hide();
      TextOutput.show("Widget uploaded successfully.");
    } catch (e) {
      Spinner.hide();
      TextOutput.show(colors.danger(`Cannot upload widget files. ${e.message}`));
    }
  }

  static get definition() {
    return {
      name: "upload",
      description: "Upload a widget to OCC.",
      args: [
        new CommandArgument({
          name: "widget-type",
          autocomplete: async () => {
            const allWidgets = await _getAllWidgetFolders();
            const formattedWidgets = await _getFormattedWidgets(allWidgets);

            return formattedWidgets;
          },
        }),
        new CommandArgument({
          name: "upload-type",
          autocomplete: async () => [
            { value: "code", description: "Updates code only." },
            {
              value: "extension",
              description: "Upload the entire widget extension.",
            },
          ],
        }),
      ],
      options: [
        new CommandOption({
          name: "file-type",
          shortName: "f",
          description: 'Specify which file type to update. Works only with the "code" upload type.',
          autocomplete: async () => ALL_UPLOAD_STEPS,
        }),
        new CommandOption({
          name: "sources-folder",
          shortName: "s",
          description: "Specify where to get the files to upload. Defaults to the project's widgets folder.",
        }),
        new CommandOption({
          name: "widget-instance-id",
          shortName: "i",
          description: "Upload will be done for a specific instance. By default it updates all instances.",
          autocomplete: async () => ALL_UPLOAD_STEPS,
        }),
      ],
    };
  }
}

module.exports = UploadWidgetCommand;
