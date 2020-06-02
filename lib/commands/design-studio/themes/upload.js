const colors = require("../../../cli/ui/theme");
const Spinner = require("../../../cli/ui/output/Spinner");
const OccApiType = require("../../../api/occ-client/OccApiType");
const TextOutput = require("../../../cli/ui/output/TextOutput");
const FolderType = require("../../../cli/project/folder-structure/FolderType");

const { uploadTheme } = require("../../../api/design-studio/theme");
const { getProjectFolderPath } = require("../../../cli/project/folder-structure/paths");
const { getOccClientForCurrentEnv } = require("../../../cli/occ");
const { buildThemeStyles, buildThemeVariables } = require("../../../api/design-studio/theme/build");
const { Command, CommandArgument, CommandOption } = require("../../../cli/command");

class UploadThemeCommand extends Command {
  async execute(themeId, options = {}) {
    try {
      Spinner.setText("Building theme files...");
      Spinner.show();

      const lessFilesPath = options.sourcesFolder || getProjectFolderPath(FolderType.THEME_SOURCES);
      const stylesFileContent = await buildThemeStyles(lessFilesPath);
      const variablesFileContent = await buildThemeVariables(lessFilesPath);

      Spinner.setText("Uploading theme...");

      const occClient = await getOccClientForCurrentEnv(OccApiType.COMMERCE_ADMIN);
      await uploadTheme(occClient, themeId, { styles: stylesFileContent, variables: variablesFileContent });

      Spinner.hide();
      TextOutput.show("Theme files uploaded successfully.");
    } catch (e) {
      Spinner.hide();
      TextOutput.show(colors.danger(`Cannot upload theme files. ${e.message}`));
    }
  }

  static get definition() {
    return {
      name: "upload",
      description: "Upload the source files for a particular theme to OCC.",
      args: [new CommandArgument({ name: "theme-id" })],
      options: [
        new CommandOption({
          name: "sources-folder",
          shortName: "d",
          description:
            "Specify a folder where the command will get the files to upload. It defaults to the project's theme sources folder.",
        }),
      ],
    };
  }
}

module.exports = UploadThemeCommand;
