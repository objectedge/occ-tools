const colors = require("../../../cli/ui/theme");
const Spinner = require("../../../cli/ui/output/Spinner");
const OccApiType = require("../../../api/occ-client/OccApiType");
const TextOutput = require("../../../cli/ui/output/TextOutput");
const FolderType = require("../../../cli/project/folder-structure/FolderType");

const { UiElementSource } = require("../../../api/design-studio");
const { getProjectFolderPath } = require("../../../cli/project/folder-structure/paths");
const { getOccClientForCurrentEnv } = require("../../../cli/occ");
const { downloadWidgetFromAssetPackages } = require("../../../api/design-studio/widget/download");
const { Command, CommandArgument, CommandOption } = require("../../../cli/command");

async function _getWidgetDescriptor(occClient, widgetType, options = {}) {
  const response = await occClient.getAllWidgetDescriptors({
    options: { fields: "id,version,source,widgetType,i18nresources" },
  });

  const candidates = response.items.filter((i) => i.widgetType === widgetType);

  if (!candidates.length) {
    return;
  }

  if (options.version) {
    if (candidates.every((c) => c.version !== parseInt(options.version))) {
      const latest = candidates.reduce((a, b) => (b.version > a.version ? b : a));
      throw new Error(`Version "${options.version}" not found (Latest available: "${latest.version}").`);
    }
  }

  if (candidates.length === 1) {
    return candidates[0];
  } else {
    return candidates.reduce((a, b) => (b.version > a.version ? b : a));
  }
}

class DownloadWidgetCommand extends Command {
  async execute(widgetType, options = {}) {
    try {
      Spinner.setText("Gathering information...");
      Spinner.show();

      const occClient = await getOccClientForCurrentEnv(OccApiType.COMMERCE_ADMIN);
      const widgetDescriptor = await _getWidgetDescriptor(occClient, widgetType, { version: options.version });

      if (!widgetDescriptor) {
        throw new Error(`Widget "${widgetType}" not found.`);
      }

      if (options.widgetInstanceId) {
        const { items: instances } = await occClient.getInstancesForWidgetDescriptor(widgetType, {
          options: { fields: "repositoryId" },
        });

        if (instances.every((i) => i.repositoryId !== options.widgetInstanceId)) {
          throw new Error(`Widget instance "${options.widgetInstanceId}" not found.`);
        }
      }

      let destinationFolder = options.destinationFolder;

      if (!destinationFolder) {
        destinationFolder = getProjectFolderPath(
          widgetDescriptor.source === UiElementSource.OOTB.id ? FolderType.WIDGETS_OOTB : FolderType.WIDGETS_CUSTOM
        );
      }

      Spinner.setText("Downloading widget...");

      let widgetInstanceId = options.widgetInstanceId;

      if (!widgetInstanceId) {
        const { items: instances } = await occClient.getInstancesForWidgetDescriptor(widgetType, {
          options: { fields: "repositoryId" },
        });

        if (instances.length) {
          widgetInstanceId = instances[0].repositoryId;
        }
      }

      if (!widgetInstanceId) {
        // TODO: for asset packages you must have the widget instance id.
        // An idea I have to work around this limitation is to instantiate the widget temporarily,
        // download the widget sources, and then remove the temp instance.
        throw new Error(`No widget instances found.`);
      }

      await downloadWidgetFromAssetPackages(occClient, widgetType, widgetInstanceId, destinationFolder, {
        unzipFile: true,
      });

      Spinner.hide();
      TextOutput.show("Widget downloaded succesfully.");
    } catch (e) {
      Spinner.hide();
      console.log(e);
      TextOutput.show(colors.danger(`Cannot download widget. ${e.message}`));
    }
  }

  static get definition() {
    return {
      name: "download",
      description: "Download the source files for a particular widget from OCC.",
      args: [new CommandArgument({ name: "widget-type" })],
      options: [
        new CommandOption({
          name: "version",
          shortName: "v",
          description: "Download from a specific widget version. Defaults to the latest version.",
        }),
        new CommandOption({
          name: "widget-instance-id",
          shortName: "i",
          description: "Download from a specific widget instance. Defaults to the base widget files.",
        }),
        new CommandOption({
          name: "destination-folder",
          shortName: "d",
          description: "Place files into a specific folder. Defaults to the project's widgets folder.",
        }),
      ],
    };
  }
}

module.exports = DownloadWidgetCommand;
