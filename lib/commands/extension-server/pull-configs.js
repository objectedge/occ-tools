const Spinner = require("../../cli/ui/output/Spinner");
const colors = require("../../cli/ui/theme");
const OccApiType = require("../../api/occ-client/OccApiType");
const TextOutput = require("../../cli/ui/output/TextOutput");

const { Command } = require("../../cli/command");
const { pushAdminConfigs } = require("../../api/extension-server/commands");
const { getOccClientForCurrentEnv } = require("../../cli/occ");

class PullConfigsCommand extends Command {
  async execute() {
    try {
      Spinner.setText(`Requesting extension server to pull any config changes...`);
      Spinner.show();

      const occClient = await getOccClientForCurrentEnv(OccApiType.COMMERCE_ADMIN);
      await pushAdminConfigs(occClient);

      Spinner.hide();
      TextOutput.show("Request successfully sent to extension server.");
    } catch (e) {
      Spinner.hide();
      TextOutput.show(colors.danger(`Cannot trigger server push. ${e.message}`));
    }
  }

  static get definition() {
    return {
      name: "pull-configs",
      description: "Pull configurations (like extension server env variables) from OCC admin.",
    };
  }
}

module.exports = PullConfigsCommand;
