const ListWidgetsCommand = require("./list");
const UploadWidgetCommand = require("./upload");
const DownloadWidgetCommand = require("./download");

const { Command } = require("../../../cli/command");

class WidgetCommand extends Command {
  static get definition() {
    return {
      name: "widgets",
      description: "Widgets Management",
      subcommands: [ListWidgetsCommand, UploadWidgetCommand, DownloadWidgetCommand],
    };
  }
}

module.exports = WidgetCommand;
