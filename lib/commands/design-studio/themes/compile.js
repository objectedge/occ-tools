const colors = require("../../../cli/ui/theme");
const Spinner = require("../../../cli/ui/output/Spinner");
const OccApiType = require("../../../api/occ-client/OccApiType");
const TextOutput = require("../../../cli/ui/output/TextOutput");

const { Command, CommandArgument } = require("../../../cli/command");
const { getOccClientForCurrentEnv } = require("../../../cli/occ");
const { CompilationStatus, triggerThemeCompilation } = require("../../../api/design-studio/theme/compilation");

class CompileThemeCommand extends Command {
  async execute(siteId, themeId) {
    try {
      Spinner.setText("Compiling theme...");
      Spinner.show();

      const occClient = await getOccClientForCurrentEnv(OccApiType.COMMERCE_ADMIN);
      const compilationInfo = await triggerThemeCompilation(occClient, { siteId, themeId });

      Spinner.hide();

      if (!compilationInfo) {
        TextOutput.show(colors.danger("There is no info about the compilation status."));
        return;
      }

      switch (compilationInfo.status) {
        case CompilationStatus.IN_PROGRESS:
          TextOutput.show(
            'It seems the compilation is still in progress. Please wait for a few more minutes. You can use the "theme compilation-status" command to check only for the status.'
          );
          break;
        case CompilationStatus.SUCCESS:
          TextOutput.show("Theme successfully compiled.");
          break;
        case CompilationStatus.FAILURE:
          TextOutput.show(`Theme compilation failed.`);

          if (compilationInfo.details) {
            TextOutput.show(`Details: ${compilationInfo.details}`);
          }
          break;
        default:
          TextOutput.show(colors.danger(`Unknown compilation status received: ${compilationInfo.status}`));
          break;
      }
    } catch (e) {
      Spinner.hide();
      TextOutput.show(colors.danger(`Cannot compile theme. ${e.message}`));
    }
  }

  static get definition() {
    return {
      name: "compile",
      description: "Ask OCC to compile a theme.",
      args: [new CommandArgument({ name: "site-id" }), new CommandArgument({ name: "theme-id" })],
    };
  }
}

module.exports = CompileThemeCommand;
