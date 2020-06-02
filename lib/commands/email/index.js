const ListEmailTemplatesCommand = require("./list");
const UploadEmailTemplateCommand = require("./upload");
const DownloadEmailTemplateCommand = require("./download");

const { Command } = require("../../cli/command");
const { executionContext } = require("../../cli/execution-context");

class EmailCommand extends Command {
  static get definition() {
    return {
      name: "email-templates",
      description: "OCC email templates management",
      subcommands: [ListEmailTemplatesCommand, UploadEmailTemplateCommand, DownloadEmailTemplateCommand],
      isDisabled() {
        const { project, environment } = executionContext().get();
        return !project || !environment;
      },
    };
  }
}

module.exports = EmailCommand;
