const ChangeContextCommand = require("./change-to");
const ChangeEnvironentCommand = require("./change-environment-to");

const { Command } = require("../../cli/command");
const { getProjectsRegistry } = require("../../cli/project/registry");

class ExecutionContextCommand extends Command {
  static get definition() {
    return {
      name: "execution-context",
      description: "Operations on top of the current execution context",
      subcommands: [ChangeContextCommand, ChangeEnvironentCommand],
      isDisabled() {
        return !getProjectsRegistry().getRegisteredProjects().length;
      },
    };
  }
}

module.exports = ExecutionContextCommand;
