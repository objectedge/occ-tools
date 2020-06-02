const Table = require("../../../cli/ui/output/Table");
const colors = require("../../../cli/ui/theme");
const Spinner = require("../../../cli/ui/output/Spinner");
const OccApiType = require("../../../api/occ-client/OccApiType");
const TextOutput = require("../../../cli/ui/output/TextOutput");

const { Command } = require("../../../cli/command");
const { getOccClientForCurrentEnv } = require("../../../cli/occ");

class ListThemesCommand extends Command {
  async execute() {
    try {
      Spinner.setText("Gathering information...");
      Spinner.show();

      const occClient = await getOccClientForCurrentEnv(OccApiType.COMMERCE_ADMIN);
      const { items: themes } = await occClient.getThemes();

      Spinner.hide();

      if (themes.length) {
        TextOutput.show(`${themes.length} themes found:`);
        new Table(
          ["ID", "Name", "Default theme", "Custom theme"],
          themes.map((t) => [t.repositoryId, t.name, t.is_default ? "Yes" : "No", t.is_custom ? "Yes" : "No"])
        ).show();
      } else {
        TextOutput.show("No themes found.");
      }
    } catch (e) {
      Spinner.hide();
      TextOutput.show(colors.danger(`Cannot list themes. ${e.message}`));
    }
  }

  static get definition() {
    return {
      name: "list",
      description: "List all themes",
    };
  }
}

module.exports = ListThemesCommand;
