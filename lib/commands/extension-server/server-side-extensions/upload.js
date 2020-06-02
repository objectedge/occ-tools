const { join } = require("path");
const { exists, readdir } = require("fs-extra");

const colors = require("../../../cli/ui/theme");
const Spinner = require("../../../cli/ui/output/Spinner");
const OccApiType = require("../../../api/occ-client/OccApiType");
const TextOutput = require("../../../cli/ui/output/TextOutput");
const FolderType = require("../../../cli/project/folder-structure/FolderType");

const { uploadSse } = require("../../../api/extension-server/server-side-extensions");
const { getProjectFolderPath } = require("../../../cli/project/folder-structure/paths");
const { getOccClientForCurrentEnv } = require("../../../cli/occ");
const { Command, CommandArgument, CommandOption } = require("../../../cli/command");

class UploadSseCommand extends Command {
  async execute(sseName, options = {}) {
    try {
      Spinner.setText("Uploading server-side extension...");
      Spinner.show();

      const sseFolderPath = join(
        options.sourceFolder || getProjectFolderPath(FolderType.SERVER_SIDE_EXTENSIONS),
        sseName
      );

      if (!(await exists(sseFolderPath))) {
        throw new Error(`Server-side extension not found on folder: ${colors.bold(sseFolderPath)}`);
      }

      const occClient = await getOccClientForCurrentEnv(OccApiType.COMMERCE_ADMIN);
      await uploadSse(occClient, sseName, sseFolderPath);

      Spinner.hide();
      TextOutput.show("Server-side extension upload successfully finished.");
    } catch (e) {
      Spinner.hide();
      TextOutput.show(colors.danger(`Cannot upload server-side extension. ${e.message}`));
    }
  }

  static get definition() {
    return {
      name: "upload",
      description: "Upload a server-side extension to OCC.",
      args: [
        new CommandArgument({
          name: "sse-name",
          autocomplete: async () => {
            const rootFolderPath = getProjectFolderPath(FolderType.SERVER_SIDE_EXTENSIONS);
            const folderNames = await readdir(rootFolderPath);
            const sses = [];

            await Promise.all(
              folderNames.map(async (folderName) => {
                if (await exists(join(rootFolderPath, folderName, "package.json"))) {
                  sses.push({
                    value: folderName,
                    label: "Server-side Extension",
                  });
                }
              })
            );

            return sses;
          },
        }),
      ],
      options: [
        new CommandOption({
          name: "source-folder",
          shortName: "d",
          description:
            "Specify a folder where the command will get the files to upload. It defaults to the SSEs folder on the project.",
        }),
      ],
    };
  }
}

module.exports = UploadSseCommand;
