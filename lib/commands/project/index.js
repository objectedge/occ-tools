const { Command } = require("../../cli/command");
const RegisterProjectCommand = require("./register");
const UnregisterProjectCommand = require("./unregister");
const ListRegisteredProjectsCommand = require("./list");

class ProjectCommand extends Command {
  static get definition() {
    return {
      name: "projects",
      description: "OCC projects management",
      subcommands: [RegisterProjectCommand, UnregisterProjectCommand, ListRegisteredProjectsCommand],
    };
  }
}

module.exports = ProjectCommand;
