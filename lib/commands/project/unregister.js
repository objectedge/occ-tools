const colors = require("../../cli/ui/theme");
const Spinner = require("../../cli/ui/output/Spinner");
const TextOutput = require("../../cli/ui/output/TextOutput");
const Confirmation = require("../../cli/ui/input/Confirmation");
const { getProjectsRegistry } = require("../../cli/project/registry");
const { Command, CommandArgument } = require("../../cli/command");

class UnregisterProjectCommand extends Command {
  async execute(projectName) {
    try {
      const shouldProceed = await new Confirmation(`The project "${projectName}" will be removed. Proceed?`).ask();

      if (shouldProceed) {
        const projectsRegistry = getProjectsRegistry();
        Spinner.setText("Removing project...");
        Spinner.show();

        if (!projectsRegistry.isProjectRegistered(projectName)) {
          throw new Error(`Project "${projectName}" is not registered.`);
        }

        await projectsRegistry.unregisterProject(projectName);

        Spinner.hide();
        TextOutput.show("Project unregistered successfully.");
      }
    } catch (e) {
      Spinner.hide();
      TextOutput.show(colors.danger(`Cannot unregister project. ${e.message}`));
    }
  }

  static get definition() {
    return {
      name: "unregister",
      description: "Unregister an OCC project.",
      args: [
        new CommandArgument({
          name: "project-name",
          description: "The name of the project that will be unregistered.",
          autocomplete: async () => {
            return getProjectsRegistry()
              .getRegisteredProjects()
              .map((p) => ({ value: p.id, label: p.descriptor.name }));
          },
        }),
      ],
      isDisabled() {
        return getProjectsRegistry().getRegisteredProjects().length === 0;
      },
    };
  }
}

module.exports = UnregisterProjectCommand;
