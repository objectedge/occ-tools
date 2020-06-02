const picomatch = require("picomatch");
const { join } = require("path");

const colors = require("../../cli/ui/theme");
const Spinner = require("../../cli/ui/output/Spinner");
const TextOutput = require("../../cli/ui/output/TextOutput");
const FolderType = require("../../cli/project/folder-structure/FolderType");
const OccApiType = require("../../api/occ-client/OccApiType");
const MediaFolders = require("../../api/media/MediaFolders");
const Confirmation = require("../../cli/ui/input/Confirmation");

const { downloadMediaFiles } = require("../../api/media");
const { getProjectFolderPath } = require("../../cli/project/folder-structure/paths");
const { getOccClientForCurrentEnv } = require("../../cli/occ");
const { Command, CommandArgument, CommandOption } = require("../../cli/command");

async function _getFilesToDownload(occClient, remoteFolder, remotePath, glob) {
  const doesMatchPattern = picomatch(join("/", remoteFolder, remotePath, glob || ""));
  const filesToDownload = [];
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

    filesToDownload.push(...matches);

    total = result.total;
    offset += limit;
  } while (offset < total);

  return filesToDownload;
}

class DownloadMediaFileCommand extends Command {
  async execute(remotePath, options = {}) {
    try {
      Spinner.setText("Gathering information...");
      Spinner.show();

      const mediaFolder = options.mediaFolder || MediaFolders.GENERAL;
      const destinationPath = options.destinationPath || getProjectFolderPath(FolderType.MEDIA_FILES);

      const occClient = await getOccClientForCurrentEnv(OccApiType.COMMERCE_ADMIN);
      const filesToDownload = await _getFilesToDownload(occClient, mediaFolder, remotePath, options.glob);

      Spinner.hide();

      if (filesToDownload.length === 0) {
        TextOutput.show("There are no files available to download.");
        return;
      } else {
        const shouldProceed = await new Confirmation(
          `${filesToDownload.length} file(s) will be downloaded to "${destinationPath}". Proceed?`
        ).ask();

        if (!shouldProceed) {
          return;
        }
      }

      Spinner.setText("Downloading file(s)...");
      Spinner.show();

      await downloadMediaFiles(
        occClient,
        filesToDownload.map((f) => f.path),
        destinationPath
      );

      Spinner.hide();
      TextOutput.show("File(s) uploaded successfully.");
    } catch (e) {
      Spinner.hide();
      TextOutput.show(colors.danger(`Cannot upload file(s). ${e.message}`));
    }
  }

  static get definition() {
    return {
      name: "download",
      description: "Download files from OCC media.",
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
          description: "Specify a glob pattern so only the files that match this pattern will be downloaded.",
        }),
        new CommandOption({
          name: "destination-path",
          shortName: "d",
          description: "Specify a folder where the files will be placed. Defaults to the media folder on project.",
        }),
        new CommandOption({
          name: "media-folder",
          shortName: "f",
          description: "Specify a OCC media folder from where the files will grabbed.",
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

module.exports = DownloadMediaFileCommand;
