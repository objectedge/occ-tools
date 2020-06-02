const { parse } = require("path");

const Table = require("../../../cli/ui/output/Table");
const colors = require("../../../cli/ui/theme");
const Spinner = require("../../../cli/ui/output/Spinner");
const OccApiType = require("../../../api/occ-client/OccApiType");
const TextOutput = require("../../../cli/ui/output/TextOutput");

const { Command } = require("../../../cli/command");
const { formatBytes } = require("../../../utils/format");
const { getInstalledSses } = require("../../../api/extension-server/server-side-extensions");
const { getOccClientForCurrentEnv } = require("../../../cli/occ");

class ListSseCommand extends Command {
  async execute() {
    try {
      Spinner.setText("Gathering information...");
      Spinner.show();

      const occClient = await getOccClientForCurrentEnv(OccApiType.COMMERCE_ADMIN);
      const installedSses = await getInstalledSses(occClient);

      Spinner.hide();

      if (installedSses.length) {
        TextOutput.show(
          `${installedSses.length} installed ${
            installedSses.length === 1 ? "server-side extension" : "server-side extensions"
          }:`
        );
        new Table(
          ["Name", "Last Modified", "Size", "Checksum"],
          installedSses.map((s) => [
            parse(s.path).name,
            new Date(s.lastModified).toLocaleString(),
            formatBytes(s.size),
            s.checksum,
          ])
        ).show();
      } else {
        TextOutput.show("No server-side extensions are found on the extension server.");
      }
    } catch (e) {
      Spinner.hide();
      TextOutput.show(colors.danger(`Cannot list server-side extensions. ${e.message}`));
    }
  }

  static get definition() {
    return {
      name: "list",
      description: "List all installed server-side extensions.",
    };
  }
}

module.exports = ListSseCommand;
