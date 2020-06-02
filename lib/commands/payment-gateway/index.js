const ListPaymentGatewaysCommand = require("./list");

const { Command } = require("../../cli/command");
const { executionContext } = require("../../cli/execution-context");

class PaymentGatewayCommand extends Command {
  static get definition() {
    return {
      name: "payment-gateways",
      description: "Payment gateway commands",
      subcommands: [ListPaymentGatewaysCommand],
      isDisabled() {
        const { project, environment } = executionContext().get();
        return !project || !environment;
      },
    };
  }
}

module.exports = PaymentGatewayCommand;
