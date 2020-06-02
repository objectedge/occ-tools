const { exists, stat } = require("fs-extra");
const { join, isAbsolute, parse } = require("path");

const colors = require("../../cli/ui/theme");
const Spinner = require("../../cli/ui/output/Spinner");
const OccApiType = require("../../api/occ-client/OccApiType");
const TextOutput = require("../../cli/ui/output/TextOutput");
const FolderType = require("../../cli/project/folder-structure/FolderType");
const MediaFolders = require("../../api/media/MediaFolders");
const Confirmation = require("../../cli/ui/input/Confirmation");

const { walkDir } = require("../../utils/fs");
const { uploadMediaFiles } = require("../../api/media");
const { getProjectFolderPath } = require("../../cli/project/folder-structure/paths");
const { getOccClientForCurrentEnv } = require("../../cli/occ");
const { Command, CommandArgument, CommandOption } = require("../../cli/command");

class UploadMediaFileCommand extends Command {
  async execute(sourcePath, options = {}) {
    try {
      Spinner.setText("Gathering information...");
      Spinner.show();

      const resolvedSourcePath = isAbsolute(sourcePath)
        ? sourcePath
        : join(getProjectFolderPath(FolderType.MEDIA_FILES), sourcePath);

      if (!(await exists(resolvedSourcePath))) {
        throw new Error(`Source path must point to an existent file or directory.`);
      }

      const sourcePathStats = await stat(resolvedSourcePath);
      let filesToUpload = [];

      if (sourcePathStats.isDirectory()) {
        filesToUpload = await walkDir(resolvedSourcePath, { glob: join(resolvedSourcePath, options.glob) });
        Spinner.hide();

        if (filesToUpload.length === 0) {
          if (options.glob) {
            TextOutput.show("No files to upload were found that matches the glob pattern.");
          } else {
            TextOutput.show("No files to upload were found on directory.");
          }

          return;
        }

        const shouldProceed = await new Confirmation(
          `${filesToUpload.length} file(s) will be uploaded. Proceed?`
        ).ask();

        if (!shouldProceed) {
          return;
        }

        Spinner.setText("Uploading files...");
        Spinner.show();
      } else {
        filesToUpload.push(resolvedSourcePath);
        Spinner.setText("Uploading file...");
      }

      const mediaFolder = options.mediaFolder || MediaFolders.GENERAL;
      const occClient = await getOccClientForCurrentEnv(OccApiType.COMMERCE_ADMIN);

      await uploadMediaFiles(
        occClient,
        filesToUpload.map((filePath) => ({ name: join("/", mediaFolder, parse(filePath).base), path: filePath })),
        { mediaFolder }
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
      name: "upload",
      description: "Upload files into OCC media.",
      args: [
        new CommandArgument({
          name: "source-path",
          description: "The path where the files are located. It can point to either a directory or a file.",
        }),
      ],
      options: [
        new CommandOption({
          name: "glob",
          shortName: "g",
          description: "Specify a glob pattern so only the files that match this pattern will be uploaded.",
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

module.exports = UploadMediaFileCommand;
