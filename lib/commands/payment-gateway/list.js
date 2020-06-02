const { tick, cross } = require("figures");

const Table = require("../../cli/ui/output/Table");
const colors = require("../../cli/ui/theme");
const Spinner = require("../../cli/ui/output/Spinner");
const OccApiType = require("../../api/occ-client/OccApiType");
const TextOutput = require("../../cli/ui/output/TextOutput");

const { Command } = require("../../cli/command");
const { getOccClientForCurrentEnv } = require("../../cli/occ");

function _formatSource(source) {
  if (source === 101) {
    return "Custom";
  } else if (source === 100) {
    return "Out-of-the-box";
  } else {
    return "-";
  }
}

class ListPaymentGatewaysCommand extends Command {
  async execute() {
    try {
      Spinner.setText("Gathering information...");
      Spinner.show();

      const occClient = await getOccClientForCurrentEnv(OccApiType.COMMERCE_ADMIN);
      const { paymentGateways } = await occClient.getGateways();

      Spinner.hide();

      TextOutput.show(`${paymentGateways.length} payment gateways found:`);
      new Table(
        ["ID", "Type", "Provider", "Source", "Supported Types", "Enabled"],
        paymentGateways.map((p) => [
          p.repositoryId,
          p.type,
          p.provider || "-",
          _formatSource(p.source),
          p.supportedTypes.join(", "),
          p.enabled ? colors.success(tick) : colors.danger(cross),
        ])
      ).show();
    } catch (e) {
      Spinner.hide();
      TextOutput.show(colors.danger(`Cannot list payment gateways. ${e.message}`));
    }
  }

  static get definition() {
    return {
      name: "list",
      description: "List all payment gateways",
    };
  }
}

module.exports = ListPaymentGatewaysCommand;
