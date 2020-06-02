const colors = require("../../../cli/ui/theme");
const Spinner = require("../../../cli/ui/output/Spinner");
const OccApiType = require("../../../api/occ-client/OccApiType");
const TextOutput = require("../../../cli/ui/output/TextOutput");
const FolderType = require("../../../cli/project/folder-structure/FolderType");

const { downloadTheme } = require("../../../api/design-studio/theme");
const { getProjectFolderPath } = require("../../../cli/project/folder-structure/paths");
const { getOccClientForCurrentEnv } = require("../../../cli/occ");
const { Command, CommandArgument, CommandOption } = require("../../../cli/command");

class DownloadThemeCommand extends Command {
  async execute(themeId, options = {}) {
    try {
      Spinner.setText("Downloading theme files...");
      Spinner.show();

      const destinationFolderPath = options.destinationFolder || getProjectFolderPath(FolderType.THEME_SOURCES);
      const occClient = await getOccClientForCurrentEnv(OccApiType.COMMERCE_ADMIN);

      await downloadTheme(occClient, themeId, destinationFolderPath);

      Spinner.hide();

      TextOutput.show("Theme files downloaded succesfully.");
    } catch (e) {
      Spinner.hide();
      TextOutput.show(colors.danger(`Cannot download theme files. ${e.message}`));
    }
  }

  static get definition() {
    return {
      name: "download",
      description: "Download the source files for a particular theme from OCC.",
      args: [new CommandArgument({ name: "theme-id" })],
      options: [
        new CommandOption({
          name: "destination-folder",
          shortName: "d",
          description: "Place the downloaded files into a specific folder. It defaults to the project boilerplate.",
        }),
      ],
    };
  }
}

module.exports = DownloadThemeCommand;
