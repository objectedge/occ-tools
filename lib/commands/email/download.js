const colors = require("../../cli/ui/theme");
const Spinner = require("../../cli/ui/output/Spinner");
const OccApiType = require("../../api/occ-client/OccApiType");
const TextOutput = require("../../cli/ui/output/TextOutput");
const FolderType = require("../../cli/project/folder-structure/FolderType");
const { getProjectFolderPath } = require("../../cli/project/folder-structure/paths");
const { downloadEmailTemplate } = require("../../api/email-templates");
const { getOccClientForCurrentEnv } = require("../../cli/occ");
const { Command, CommandArgument, CommandOption } = require("../../cli/command");

class DownloadEmailTemplateCommand extends Command {
  async execute(emailTemplateId, options = {}) {
    try {
      Spinner.setText("Downloading email template...");
      Spinner.show();

      const destinationFolderPath = options.destinationFolder || getProjectFolderPath(FolderType.EMAIL_TEMPLATES);
      const occClient = await getOccClientForCurrentEnv(OccApiType.COMMERCE_ADMIN);

      await downloadEmailTemplate(occClient, emailTemplateId, destinationFolderPath, { siteId: options.siteId });

      Spinner.hide();

      TextOutput.show("Email template downloaded succesfully.");
    } catch (e) {
      Spinner.hide();
      new TextOutput(colors.danger(`Cannot download email template. ${e.message}`)).show();
    }
  }

  static get definition() {
    return {
      name: "download",
      description: "Download an email template from OCC.",
      args: [new CommandArgument({ name: "email-template-id" })],
      options: [
        new CommandOption({
          name: "site-id",
          shortName: "s",
          description: 'Download the email template for a specific site. Defaults to "siteUS"',
        }),
        new CommandOption({
          name: "destination-folder",
          shortName: "d",
          description:
            "Place the downloaded files into a specific folder. It defaults to the emails folder on project.",
        }),
      ],
    };
  }
}

module.exports = DownloadEmailTemplateCommand;
