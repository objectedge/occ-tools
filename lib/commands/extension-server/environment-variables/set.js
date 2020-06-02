const colors = require("../../../cli/ui/theme");
const Spinner = require("../../../cli/ui/output/Spinner");
const OccApiType = require("../../../api/occ-client/OccApiType");
const TextOutput = require("../../../cli/ui/output/TextOutput");

const { setVariable } = require("../../../api/extension-server/environment-variables");
const { Command, CommandArgument } = require("../../../cli/command");
const { getOccClientForCurrentEnv } = require("../../../cli/occ");

class SetEnvironmentVariableCommand extends Command {
  async execute(variableName, variableValue) {
    try {
      Spinner.setText("Settting variable...");
      Spinner.show();

      const occClient = await getOccClientForCurrentEnv(OccApiType.COMMERCE_ADMIN);
      await setVariable(occClient, variableName, variableValue);

      Spinner.hide();

      TextOutput.show("Environment variable successfully set.");
    } catch (e) {
      Spinner.hide();
      TextOutput.show(colors.danger(`Cannot set environment variable. ${e.message}`));
    }
  }

  static get definition() {
    return {
      name: "set",
      description: "Set an environment variable. If it already exists the value will be updated instead.",
      args: [
        new CommandArgument({
          name: "variable-name",
          description: "Environment variable name",
        }),
        new CommandArgument({
          name: "variable-value",
          description: "Environment variable value",
        }),
      ],
    };
  }
}

module.exports = SetEnvironmentVariableCommand;
