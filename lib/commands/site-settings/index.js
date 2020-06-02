const ListSiteSettingsCommand = require("./list");

const { Command } = require("../../cli/command");
const { executionContext } = require("../../cli/execution-context");

class SiteSettingsCommand extends Command {
  static get definition() {
    return {
      name: "site-settings",
      description: "Site settings Management",
      subcommands: [ListSiteSettingsCommand],
      isDisabled() {
        const { project, environment } = executionContext().get();
        return !project || !environment;
      },
    };
  }
}

module.exports = SiteSettingsCommand;
