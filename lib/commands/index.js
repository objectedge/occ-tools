const ExitCommand = require("./exit");
const EmailCommand = require("./email");
const MediaCommand = require("./media");
const ProjectCommand = require("./project");
const DesignStudioCommand = require("./design-studio");
const SiteSettingsCommand = require("./site-settings");
const PaymentGatewayCommand = require("./payment-gateway");
const ExtensionServerCommand = require("./extension-server");
const ExecutionContextCommand = require("./execution-context");

const { registerCommand } = require("../cli/command/registry");

let _loaded = false;
async function loadCommands() {
  if (_loaded) {
    return;
  }

  registerCommand(ExitCommand);
  registerCommand(EmailCommand);
  registerCommand(MediaCommand);
  registerCommand(ProjectCommand);
  registerCommand(DesignStudioCommand);
  registerCommand(SiteSettingsCommand);
  registerCommand(PaymentGatewayCommand);
  registerCommand(ExtensionServerCommand);
  registerCommand(ExecutionContextCommand);

  _loaded = true;
}

module.exports = {
  loadCommands,
};
