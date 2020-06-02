const { join } = require("path");
const { exists } = require("fs-extra");

const colors = require("../../../cli/ui/theme");
const Spinner = require("../../../cli/ui/output/Spinner");
const Question = require("../../../cli/ui/input/Question");
const OccApiType = require("../../../api/occ-client/OccApiType");
const ChoiceList = require("../../../cli/ui/input/ChoiceList");
const TextOutput = require("../../../cli/ui/output/TextOutput");
const FolderType = require("../../../cli/project/folder-structure/FolderType");

const { downloadSse } = require("../../../api/extension-server/server-side-extensions");
const { getProjectFolderPath } = require("../../../cli/project/folder-structure/paths");
const { getOccClientForCurrentEnv } = require("../../../cli/occ");
const { Command, CommandArgument, CommandOption } = require("../../../cli/command");

class DownloadSseCommand extends Command {
  async execute(extensionName, options = {}) {
    try {
      const destinationFolderPath =
        options.destinationFolder || getProjectFolderPath(FolderType.SERVER_SIDE_EXTENSIONS);
      let sseFolderPath = join(destinationFolderPath, extensionName);
      let proceed = false;

      while (!proceed) {
        if (await exists(sseFolderPath)) {
          const { id: action } = await new ChoiceList(
            `The destination folder ${sseFolderPath} already exists. What do you want to do?`,
            [
              { id: "overwrite", displayName: "That's okay, you can overwrite it." },
              { id: "chooseNewFolder", displayName: "Hmmm, actually I wanna choose another folder." },
              { id: "cancel", displayName: "Actually I've changed my mind. I wanna cancel this operation." },
            ]
          ).ask();

          if (action === "overwrite") {
            proceed = true;
          } else if (action === "chooseNewFolder") {
            const newFolder = await new Question("Enter the new destination folder: ").ask();
            sseFolderPath = join(newFolder, extensionName);
          } else {
            return;
          }
        } else {
          proceed = true;
        }
      }

      Spinner.setText(`Downloading server-side extension...`);
      Spinner.show();

      const occClient = await getOccClientForCurrentEnv(OccApiType.COMMERCE_ADMIN);
      await downloadSse(occClient, extensionName, sseFolderPath);

      Spinner.hide();
      TextOutput.show("Download finished successfully.");
    } catch (e) {
      Spinner.hide();
      TextOutput.show(colors.danger(`Cannot download server-side extension. ${e.message}`));
    }
  }

  static get definition() {
    return {
      name: "download",
      description: "Download a server-side extension from the extension server.",
      args: [
        new CommandArgument({
          name: "extension-name",
          description: "Name of the server-side extension to be downloaded.",
        }),
      ],
      options: [
        new CommandOption({
          name: "destination-folder",
          shortName: "f",
          description: "Place the downloaded files into a specific folder. It defaults to the project's SSEs folder.",
        }),
      ],
    };
  }
}

module.exports = DownloadSseCommand;
