const { Command } = require("../../../cli/command");

class StackCommand extends Command {
  static get definition() {
    return {
      name: "stacks",
      description: "Stacks Management",
      subcommands: [],
    };
  }
}

module.exports = StackCommand;
