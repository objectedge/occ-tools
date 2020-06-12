const { tick, cross } = require("figures");

const Table = require("../../../cli/ui/output/Table");
const colors = require("../../../cli/ui/theme");
const Spinner = require("../../../cli/ui/output/Spinner");
const OccApiType = require("../../../api/occ-client/OccApiType");
const TextOutput = require("../../../cli/ui/output/TextOutput");

const { CompilationStatus } = require("../../../api/design-studio/theme/compilation");
const { Command, CommandArgument } = require("../../../cli/command");
const { getOccClientForCurrentEnv } = require("../../../cli/occ");

const _statuses = {
  [CompilationStatus.IN_PROGRESS]: `${colors.primary("?")} Compilation In Progress`,
  [CompilationStatus.SUCCESS]: `${colors.success(tick)} Success`,
  [CompilationStatus.FAILURE]: `${colors.danger(cross)} Failure`,
};

class CompilationStatusCommand extends Command {
  async execute(themeId) {
    try {
      Spinner.setText("Gathering information...");
      Spinner.show();

      const occClient = await getOccClientForCurrentEnv(OccApiType.COMMERCE_ADMIN);
      const themeInfo = await occClient.getTheme(themeId);
      const compilationStatuses = themeInfo.compilationStatuses || [];

      Spinner.hide();

      if (!compilationStatuses.length) {
        TextOutput.show(
          "There is no info about the compilation status for this theme, which usually indicates that it was not compiled yet or not being in use."
        );
        return;
      }

      TextOutput.show(`Compilation status for theme ${colors.bold(themeInfo.id)} - ${colors.bold(themeInfo.name)}:`);
      new Table(
        ["Status", "Site", "Occurred At", "Details"],
        compilationStatuses.map((compilationInfo) => [
          _statuses[compilationInfo.status],
          compilationInfo.siteId,
          compilationInfo.occurredAt,
          compilationInfo.details || "-",
        ])
      ).show();
    } catch (e) {
      Spinner.hide();
      TextOutput.show(colors.danger(`Cannot list themes. ${e.message}`));
    }
  }

  static get definition() {
    return {
      name: "compilation-status",
      description: "Get the compilation status for a theme.",
      args: [new CommandArgument({ name: "theme-id" })],
    };
  }
}

module.exports = CompilationStatusCommand;
