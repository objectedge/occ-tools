const colors = require("../../cli/ui/theme");
const Spinner = require("../../cli/ui/output/Spinner");
const TextOutput = require("../../cli/ui/output/TextOutput");
const { Command, CommandArgument } = require("../../cli/command");
const { executionContext } = require("../../cli/execution-context");
const { getProjectsRegistry } = require("../../cli/project/registry");

class ChangeContextCommand extends Command {
  async execute(projectId, environmentName) {
    try {
      const project = getProjectsRegistry()
        .getRegisteredProjects()
        .find((p) => p.id === projectId);

      if (!project) {
        throw new Error(`Project "${projectId}" is not registered.`);
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
      name: "change-to",
      description: "Change current execution context",
      args: [
        new CommandArgument({
          name: "project-name",
          description: "The name of the project to be selected.",
          autocomplete: async () => {
            return getProjectsRegistry()
              .getRegisteredProjects()
              .map((p) => ({
                value: p.id,
                description: p.descriptor.name || "Project",
              }));
          },
          validator(value) {
            if (
              !getProjectsRegistry()
                .getRegisteredProjects()
                .some((project) => project.id === value)
            ) {
              throw new Error(`Project "${value}" is not registered.`);
            }
          },
        }),
        new CommandArgument({
          name: "environment-name",
          description: "The name of the environment to be selected.",
          autocomplete: async (line) => {
            const tokens = line.trim().split(" ").reverse();
            let project = getProjectsRegistry()
              .getRegisteredProjects()
              .find((p) => p.id === tokens[0]);

            if (!project) {
              project = getProjectsRegistry()
                .getRegisteredProjects()
                .find((p) => p.id === tokens[1]);

              if (!project) {
                return [];
              }
            }

            return (project.descriptor.environments || []).map((e) => ({
              value: e.name,
              description: e.url,
            }));
          },
        }),
      ],
    };
  }
}

module.exports = ChangeContextCommand;
