const colors = require("../../cli/ui/theme");
const Spinner = require("../../cli/ui/output/Spinner");
const OccApiType = require("../../api/occ-client/OccApiType");
const TextOutput = require("../../cli/ui/output/TextOutput");
const FolderType = require("../../cli/project/folder-structure/FolderType");

const { getProjectFolderPath } = require("../../cli/project/folder-structure/paths");
const { Command, CommandOption } = require("../../cli/command");
const { getOccClientForCurrentEnv } = require("../../cli/occ");
const { LoggerLevels, downloadLogs } = require("../../api/extension-server/logs");

class DownloadLogsCommand extends Command {
  async execute(options = {}) {
    try {
      const loggingLevel = options.level || LoggerLevels.DEBUG;
      const destinationFolderPath =
        options.destinationFolder || getProjectFolderPath(FolderType.SERVER_SIDE_EXTENSION_LOGS);

      Spinner.setText(`Downloading logs for ${colors.bold(loggingLevel)} level...`);
      Spinner.show();

      const occClient = await getOccClientForCurrentEnv(OccApiType.COMMERCE_ADMIN);
      await downloadLogs(occClient, destinationFolderPath, { loggingLevel });

      Spinner.hide();
      TextOutput.show("Download finished successfully.");
    } catch (e) {
      Spinner.hide();
      TextOutput.show(colors.danger(`Cannot download extension server logs. ${e.message}`));
    }
  }

  static get definition() {
    return {
      name: "download-logs",
      description: "Download log files from the extension server.",
      options: [
        new CommandOption({
          name: "level",
          shortName: "l",
          description: 'Download logs from a specific logging level. It defaults to "debug".',
          autocomplete: async () => Object.values(LoggerLevels).map((l) => ({ value: l, label: "Logging Level" })),
          validator(value) {
            if (!Object.values(LoggerLevels).includes(value)) {
              throw new Error(`Invalid logging level "${value}".`);
            }
          },
        }),
        new CommandOption({
          name: "date",
          shortName: "d",
          description: "Download logs for a particular date",
        }),
        new CommandOption({
          name: "destination-folder",
          shortName: "f",
          description: "Place the downloaded files into a specific folder. It defaults to the project boilerplate.",
        }),
      ],
    };
  }
}

module.exports = DownloadLogsCommand;
