const { Command } = require("../cli/command");
const Confirmation = require("../cli/ui/input/Confirmation");

class ExitCommand extends Command {
  async execute() {
    const shouldExit = await new Confirmation("Are you sure?", Confirmation.Yes).ask();

    if (shouldExit) {
      process.exit(0);
    }
  }

  static get definition() {
    return {
      name: "exit",
      description: "Exit the application",
    };
  }
}

module.exports = ExitCommand;
