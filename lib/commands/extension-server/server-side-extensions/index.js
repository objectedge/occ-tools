const { Command } = require("../../../cli/command");
const ListSseCommand = require("./list");
const UploadSseCommand = require("./upload");
const DownloadSseCommand = require("./download");

class ServerSideExtensionsCommand extends Command {
  static get definition() {
    return {
      name: "server-side-extensions",
      description: "Server-side extensions commands",
      subcommands: [ListSseCommand, UploadSseCommand, DownloadSseCommand],
    };
  }
}

module.exports = ServerSideExtensionsCommand;
