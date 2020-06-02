const colors = require("../../cli/ui/theme");
const Spinner = require("../../cli/ui/output/Spinner");
const OccApiType = require("../../api/occ-client/OccApiType");
const TextOutput = require("../../cli/ui/output/TextOutput");

const { Command } = require("../../cli/command");
const { requestRestart } = require("../../api/extension-server/commands");
const { getOccClientForCurrentEnv } = require("../../cli/occ");

class RestartWorkersCommand extends Command {
  async execute() {
    try {
      Spinner.setText(`Triggering restart...`);
      Spinner.show();

      const occClient = await getOccClientForCurrentEnv(OccApiType.COMMERCE_ADMIN);
      await requestRestart(occClient);

      Spinner.hide();
      TextOutput.show("Server restart triggered.");
    } catch (e) {
      Spinner.hide();
      TextOutput.show(colors.danger(`Cannot trigger server restart. ${e.message}`));
    }
  }

  static get definition() {
    return {
      name: "restart",
      description: "Restart extension server's workers.",
    };
  }
}

module.exports = RestartWorkersCommand;
