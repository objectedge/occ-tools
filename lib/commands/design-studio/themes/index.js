const ListThemesCommand = require("./list");
const UploadThemeCommand = require("./upload");
const CompileThemeCommand = require("./compile");
const DownloadThemeCommand = require("./download");
const CompilationStatusCommand = require("./compilation-status");

const { Command } = require("../../../cli/command");

class ThemeCommand extends Command {
  static get definition() {
    return {
      name: "themes",
      description: "Themes Management",
      subcommands: [
        ListThemesCommand,
        UploadThemeCommand,
        CompileThemeCommand,
        DownloadThemeCommand,
        CompilationStatusCommand,
      ],
    };
  }
}

module.exports = ThemeCommand;
