const ThemesCommand = require("./themes");
const WidgetsCommand = require("./widgets");

const { Command } = require("../../cli/command");
const { executionContext } = require("../../cli/execution-context");

class DesignStudioCommand extends Command {
  static get definition() {
    return {
      name: "design-studio",
      description: "Commands for Design Studio elements",
      subcommands: [ThemesCommand, WidgetsCommand],
      isDisabled() {
        const { project, environment } = executionContext().get();
        return !project || !environment;
      },
    };
  }
}

module.exports = DesignStudioCommand;
