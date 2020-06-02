const colors = require("../../../cli/ui/theme");
const Spinner = require("../../../cli/ui/output/Spinner");
const OccApiType = require("../../../api/occ-client/OccApiType");
const TextOutput = require("../../../cli/ui/output/TextOutput");

const { removeVariable } = require("../../../api/extension-server/environment-variables");
const { Command, CommandArgument } = require("../../../cli/command");
const { getOccClientForCurrentEnv } = require("../../../cli/occ");

class RemoveEnvironmentVariableCommand extends Command {
  async execute(environmentVariableId) {
    try {
      Spinner.setText("Removing variable...");
      Spinner.show();

      const occClient = await getOccClientForCurrentEnv(OccApiType.COMMERCE_ADMIN);
      await removeVariable(occClient, environmentVariableId);

      Spinner.hide();

      TextOutput.show("Environment variable removed succesfully.");
    } catch (e) {
      Spinner.hide();
      TextOutput.show(colors.danger(`Cannot remove environment variable. ${e.message}`));
    }
  }

  static get definition() {
    return {
      name: "remove",
      description: "Remove an environment variable.",
      args: [
        new CommandArgument({
          name: "environment-variable-id",
        }),
      ],
    };
  }
}

module.exports = RemoveEnvironmentVariableCommand;
