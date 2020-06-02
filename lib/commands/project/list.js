const Table = require("../../cli/ui/output/Table");
const colors = require("../../cli/ui/theme");
const Spinner = require("../../cli/ui/output/Spinner");
const TextOutput = require("../../cli/ui/output/TextOutput");
const { Command } = require("../../cli/command");
const { getProjectsRegistry } = require("../../cli/project/registry");

class ListRegisteredProjectsCommand extends Command {
  async execute() {
    try {
      Spinner.setText("Gathering information...");
      Spinner.show();

      const projects = getProjectsRegistry()
        .getRegisteredProjects()
        .map((p) => [p.id, p.descriptor.name, p.path]);

      Spinner.hide();

      if (projects.length) {
        TextOutput.show(`${projects.length} ${projects.length === 1 ? "project" : "projects"} are registered:`);
        new Table(["ID", "Name", "Root Path"], projects).show();
      } else {
        TextOutput.show("No registered projects yet.");
      }
    } catch (e) {
      Spinner.hide();
      TextOutput.show(colors.danger(`Cannot list projects. ${e.message}`));
    }
  }

  static get definition() {
    return {
      name: "list",
      description: "List all registered OCC projects.",
    };
  }
}

module.exports = ListRegisteredProjectsCommand;
