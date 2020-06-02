const ListMediaFilesCommand = require("./list");
const UploadMediaFileCommand = require("./upload");
const RemoveMediaFileCommand = require("./remove");
const DownloadMediaFileCommand = require("./download");

const { Command } = require("../../cli/command");
const { executionContext } = require("../../cli/execution-context");

class OccMediaCommand extends Command {
  static get definition() {
    return {
      name: "media",
      description: "Commands on top of OCC Media",
      subcommands: [ListMediaFilesCommand, UploadMediaFileCommand, RemoveMediaFileCommand, DownloadMediaFileCommand],
      isDisabled() {
        const { project, environment } = executionContext().get();
        return !project || !environment;
      },
    };
  }
}

module.exports = OccMediaCommand;
