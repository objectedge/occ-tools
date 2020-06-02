const colors = require("../../cli/ui/theme");
const Spinner = require("../../cli/ui/output/Spinner");
const TextOutput = require("../../cli/ui/output/TextOutput");
const { executionContext } = require("../../cli/execution-context");
const { Command, CommandArgument } = require("../../cli/command");

class ChangeEnvironentCommand extends Command {
  async execute(environmentName) {
    try {
      const { project } = executionContext().get();

      if (!project) {
        throw new Error(`No project defined on execution context.`);
      }

      const environment = (project.descriptor.environments || []).find((e) => e.name === environmentName);

      if (!environment) {
        throw new Error(`Environment ${environmentName} not found.`);
      }

      Spinner.setText("Changing execution context...");
      Spinner.show();

      await executionContext().set(project, environment);

      Spinner.hide();
      TextOutput.show("New execution context defined.");
    } catch (e) {
      Spinner.hide();
      TextOutput.show(colors.danger(`Cannot change execution context. ${e.message}`));
    }
  }

  static get definition() {
    return {
      name: "change-environment-to",
      description: "Shortcut to set a different environment for the current execution context",
      args: [
        new CommandArgument({
          name: "environment-name",
          description: "The name of the environment to be selected.",
          autocomplete: async () => {
            const currentContext = executionContext().get();

            if (!currentContext.project) {
              return [];
            }

            return (currentContext.project.descriptor.environments || []).map((e) => ({ value: e.name, label: e.url }));
          },
        }),
      ],
      isDisabled() {
        const currentContext = executionContext().get();
        return !currentContext || !currentContext.project;
      },
    };
  }
}

module.exports = ChangeEnvironentCommand;
