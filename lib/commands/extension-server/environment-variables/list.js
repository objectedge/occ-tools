const Table = require("../../../cli/ui/output/Table");
const colors = require("../../../cli/ui/theme");
const Spinner = require("../../../cli/ui/output/Spinner");
const OccApiType = require("../../../api/occ-client/OccApiType");
const TextOutput = require("../../../cli/ui/output/TextOutput");

const { Command } = require("../../../cli/command");
const { getCreatedVariables } = require("../../../api/extension-server/environment-variables");
const { getOccClientForCurrentEnv } = require("../../../cli/occ");

class ListEnvironmentVariablesCommand extends Command {
  async execute() {
    try {
      Spinner.setText("Gathering information...");
      Spinner.show();

      const occClient = await getOccClientForCurrentEnv(OccApiType.COMMERCE_ADMIN);
      const createdVars = await getCreatedVariables(occClient);

      Spinner.hide();

      TextOutput.show(`${createdVars.length} environment variables found:`);
      new Table(
        ["ID", "Name", "Value", "Created At", "Last Modified"],
        createdVars.map((v) => [
          v.repositoryId,
          v.name,
          v.value,
          new Date(v.creationTime).toLocaleString(),
          new Date(v.modificationTime).toLocaleString(),
        ])
      ).show();
    } catch (e) {
      Spinner.hide();
      TextOutput.show(colors.danger(`Cannot list environment variables. ${e.message}`));
    }
  }

  static get definition() {
    return {
      name: "list",
      description: "List all created environment variables",
    };
  }
}

module.exports = ListEnvironmentVariablesCommand;
