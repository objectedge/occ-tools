const picomatch = require("picomatch");
const { join } = require("path");

const colors = require("../../cli/ui/theme");
const Spinner = require("../../cli/ui/output/Spinner");
const OccApiType = require("../../api/occ-client/OccApiType");
const TextOutput = require("../../cli/ui/output/TextOutput");
const MediaFolders = require("../../api/media/MediaFolders");
const Confirmation = require("../../cli/ui/input/Confirmation");

const { deleteMediaFiles } = require("../../api/media");
const { getOccClientForCurrentEnv } = require("../../cli/occ");
const { Command, CommandArgument, CommandOption } = require("../../cli/command");

async function _getFilesToRemove(occClient, remoteFolder, remotePath, glob) {
  const doesMatchPattern = picomatch(join("/", remoteFolder, remotePath, glob || ""));
  const filesToRemove = [];
  const limit = 250;
  let offset = 0;
  let total = 0;

  do {
    const result = await occClient.getFiles({
      options: { offset, limit, fields: "path", folder: remoteFolder, assetType: "all" },
    });
    const matches = result.items.filter((item) => {
      return doesMatchPattern(item.path);
    });

    filesToRemove.push(...matches);

    total = result.total;
    offset += limit;
  } while (offset < total);

  return filesToRemove;
}

class RemoveMediaFileCommand extends Command {
  async execute(remotePath, options = {}) {
    try {
      Spinner.setText("Gathering information...");
      Spinner.show();

      const mediaFolder = options.mediaFolder || MediaFolders.GENERAL;

      const occClient = await getOccClientForCurrentEnv(OccApiType.COMMERCE_ADMIN);
      const filesToRemove = await _getFilesToRemove(occClient, mediaFolder, remotePath, options.glob);

      Spinner.hide();
      if (!filesToRemove.length) {
        TextOutput.show("No files were found for removal.");
        return;
      }

      const shouldProceed = await new Confirmation(`${filesToRemove.length} file(s) will be removed. Proceed?`).ask();

      if (!shouldProceed) {
        return;
      }

      Spinner.setText("Removing files...");
      Spinner.show();

      await deleteMediaFiles(
        occClient,
        filesToRemove.map((f) => f.path)
      );

      Spinner.hide();
      TextOutput.show("File(s) removed successfully.");
    } catch (e) {
      Spinner.hide();
      TextOutput.show(colors.danger(`Cannot remove file(s). ${e.message}`));
    }
  }

  static get definition() {
    return {
      name: "remove",
      description: "Remove files from OCC media.",
      args: [
        new CommandArgument({
          name: "remote-path",
          description: "The path where the files are located. It can point to either a directory or a file.",
        }),
      ],
      options: [
        new CommandOption({
          name: "glob",
          shortName: "g",
          description: "Specify a glob pattern so only the files that match this pattern will be uploaded.",
          autocomplete: async () => Object.values(MediaFolders).map((f) => ({ value: f, label: "Media Folder" })),
          validator(value) {
            if (!Object.values(MediaFolders).includes(value)) {
              throw new Error(`Invalid media folder "${value}".`);
            }
          },
        }),
        new CommandOption({
          name: "media-folder",
          shortName: "f",
          description: "Specify a OCC media folder where the files will be placed on.",
          autocomplete: async () => Object.values(MediaFolders).map((f) => ({ value: f, label: "Media Folder" })),
          validator(value) {
            if (!Object.values(MediaFolders).includes(value)) {
              throw new Error(`Invalid media folder "${value}".`);
            }
          },
        }),
      ],
    };
  }
}

module.exports = RemoveMediaFileCommand;
