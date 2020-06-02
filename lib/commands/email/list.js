const { tick, cross } = require("figures");

const Table = require("../../cli/ui/output/Table");
const colors = require("../../cli/ui/theme");
const Spinner = require("../../cli/ui/output/Spinner");
const OccApiType = require("../../api/occ-client/OccApiType");
const TextOutput = require("../../cli/ui/output/TextOutput");

const { Command, CommandOption } = require("../../cli/command");
const { getOccClientForCurrentEnv } = require("../../cli/occ");

class ListEmailTemplatesCommand extends Command {
  async execute(options = {}) {
    try {
      Spinner.setText("Gathering information...");
      Spinner.show();

      const onlyEnabled = options.enabledOnly || false;
      const siteId = options.siteId || "siteUS";
      const occClient = await getOccClientForCurrentEnv(OccApiType.COMMERCE_ADMIN);
      const response = await occClient.getEmailNotificationTypes({ extraHeaders: { "x-ccsite": siteId } });
      const emailTemplates = Object.keys(response)
        .filter((id) => id !== "links")
        .map((id) => response[id])
        .filter((e) => !onlyEnabled || !!e.enabled);

      if (!onlyEnabled) {
        emailTemplates.sort((a, b) => (a.enabled ? -1 : b.enabled ? 0 : 1));
      }

      Spinner.hide();

      TextOutput.show(`${emailTemplates.length} email templates found for site "${siteId}":`);
      new Table(
        ["ID", "Name", "From Email", "Enabled"],
        emailTemplates.map((e) => [
          e.id,
          e.displayName,
          e.fromEmail || "-",
          e.enabled ? colors.success(tick) : colors.danger(cross),
        ])
      ).show();
    } catch (e) {
      Spinner.hide();
      TextOutput.show(colors.danger(`Cannot list email templates. ${e.message}`));
    }
  }

  static get definition() {
    return {
      name: "list",
      description: "List all email templates",
      options: [
        new CommandOption({
          name: "site-id",
          shortName: "s",
          description: "Show the email templates for a particular site. Defaults to the default site (siteUS).",
        }),
        new CommandOption({
          name: "enabled-only",
          shortName: "e",
          description: "Show only email templates that are enabled.",
        }),
      ],
    };
  }
}

module.exports = ListEmailTemplatesCommand;
