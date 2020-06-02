const Table = require("../../cli/ui/output/Table");
const colors = require("../../cli/ui/theme");
const Spinner = require("../../cli/ui/output/Spinner");
const OccApiType = require("../../api/occ-client/OccApiType");
const TextOutput = require("../../cli/ui/output/TextOutput");

const { Command } = require("../../cli/command");
const { getOccClientForCurrentEnv } = require("../../cli/occ");

class ListSiteSettingsCommand extends Command {
  async execute() {
    try {
      Spinner.setText("Gathering information...");
      Spinner.show();

      const occClient = await getOccClientForCurrentEnv(OccApiType.COMMERCE_ADMIN);
      const { items: siteSettings } = await occClient.listSiteSettings();

      Spinner.hide();

      TextOutput.show(`${siteSettings.length} site settings found:`);
      new Table(
        ["ID", "Name", "Description"],
        siteSettings.map((s) => [s.repositoryId, s.displayName, s.description || "-"])
      ).show();
    } catch (e) {
      Spinner.hide();
      TextOutput.show(colors.danger(`Cannot list site settings. ${e.message}`));
    }
  }

  static get definition() {
    return {
      name: "list",
      description: "List all site settings",
    };
  }
}

module.exports = ListSiteSettingsCommand;
