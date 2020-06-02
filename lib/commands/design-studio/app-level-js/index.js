const { Command } = require("../../../cli/command");

class AppLevelJsCommand extends Command {
  static get definition() {
    return {
      name: "app-level-js",
      description: "App-level JS commands",
      subcommands: [],
    };
  }
}

module.exports = AppLevelJsCommand;
