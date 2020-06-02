const { Command } = require("../../../cli/command");
const SetEnvironmentVariableCommand = require("./set");
const ListEnvironmentVariablesCommand = require("./list");
const RemoveEnvironmentVariableCommand = require("./remove");

class EnvironmentVariablesCommand extends Command {
  static get definition() {
    return {
      name: "environment-variables",
      description: "Manipulate extension server environment variables",
      subcommands: [SetEnvironmentVariableCommand, ListEnvironmentVariablesCommand, RemoveEnvironmentVariableCommand],
    };
  }
}

module.exports = EnvironmentVariablesCommand;
