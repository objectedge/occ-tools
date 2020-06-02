const PushConfigsCommand = require("./pull-configs");
const DownloadLogsCommand = require("./download-logs");
const RestartWorkersCommand = require("./restart");
const EnvironmentVariablesCommand = require("./environment-variables");
const ServerSideExtensionsCommand = require("./server-side-extensions");

const { Command } = require("../../cli/command");
const { executionContext } = require("../../cli/execution-context");

class ExtensionServerCommand extends Command {
  static get definition() {
    return {
      name: "extension-server",
      description: "Extension server commands",
      subcommands: [
        PushConfigsCommand,
        DownloadLogsCommand,
        RestartWorkersCommand,
        EnvironmentVariablesCommand,
        ServerSideExtensionsCommand,
      ],
      isDisabled() {
        const { project, environment } = executionContext().get();
        return !project || !environment;
      },
    };
  }
}

module.exports = ExtensionServerCommand;
