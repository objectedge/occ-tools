const { join } = require("path");

const colors = require("../../cli/ui/theme");
const Spinner = require("../../cli/ui/output/Spinner");
const OccApiType = require("../../api/occ-client/OccApiType");
const TextOutput = require("../../cli/ui/output/TextOutput");
const FolderType = require("../../cli/project/folder-structure/FolderType");

const { createZipFile } = require("../../utils/fs");
const { uploadEmailTemplate } = require("../../api/email-templates");
const { getProjectFolderPath } = require("../../cli/project/folder-structure/paths");
const { getOccClientForCurrentEnv } = require("../../cli/occ");
const { Command, CommandArgument, CommandOption } = require("../../cli/command");

class UploadEmailTemplateCommand extends Command {
  async execute(emailTemplateId, options = {}) {
    try {
      Spinner.setText("Uploading email template...");
      Spinner.show();

      const occClient = await getOccClientForCurrentEnv(OccApiType.COMMERCE_ADMIN);
      const sourceFolderPath = options.sourceFolder || getProjectFolderPath(FolderType.EMAIL_TEMPLATES);
      const emailTemplateFolderPath = join(sourceFolderPath, emailTemplateId);
      const zipFilePath = join(sourceFolderPath, `${emailTemplateId}.zip`);

      await createZipFile(emailTemplateFolderPath, zipFilePath);
      const { success, warnings, errors } = await uploadEmailTemplate(occClient, emailTemplateId, zipFilePath, {
        siteId: options.siteId,
      });

      Spinner.hide();

      if (success) {
        if (warnings.length) {
          TextOutput.show("Email template uploaded with some warnings:");
          TextOutput.show(warnings.map((warningMsg) => colors.warning(`    - ${warningMsg}`)).join("\n"));
        } else {
          TextOutput.show("Email template uploaded successfully.");
        }
      } else {
        TextOutput.show("Email template upload failed. Check errors below:");
        TextOutput.show(errors.map((errorMsg) => colors.danger(`    - ${errorMsg}`)).join("\n"));
      }
    } catch (e) {
      Spinner.hide();
      TextOutput.show(colors.danger(`Cannot upload email template. ${e.message}`));
    }
  }

  static get definition() {
    return {
      name: "upload",
      description: "Upload an email template into OCC.",
      args: [new CommandArgument({ name: "email-template-id" })],
      options: [
        new CommandOption({
          name: "site-id",
          shortName: "s",
          description: 'Download the email template for a specific site. Defaults to "siteUS"',
        }),
        new CommandOption({
          name: "source-folder",
          shortName: "f",
          description:
            "Specify a folder where the command will get the files to upload. It defaults to the project's email templates folder.",
        }),
      ],
    };
  }
}

module.exports = UploadEmailTemplateCommand;
