const { resolve } = require("path");

const colors = require("../../cli/ui/theme");
const Spinner = require("../../cli/ui/output/Spinner");
const Question = require("../../cli/ui/input/Question");
const ChoiceList = require("../../cli/ui/input/ChoiceList");
const TextOutput = require("../../cli/ui/output/TextOutput");

const { walkDir } = require("../../utils/fs");
const { Command } = require("../../cli/command");
const { validateOccProject } = require("../../cli/project");
const { getProjectsRegistry } = require("../../cli/project/registry");

class RegisterProjectCommand extends Command {
  async execute() {
    try {
      const { id: registrationType } = await new ChoiceList("What do you want to register?", [
        { value: "singleProject", label: "Register a single project" },
        { value: "multipleProjects", label: "Register all projects located on a specific folder" },
      ]).ask();
      const folderPath = await new Question("Enter root folder").ask();
      const projectsToRegister = [];

      Spinner.setText("Performing registraton...");
      Spinner.show();

      if (registrationType === "singleProject") {
        try {
          await validateOccProject(folderPath);
        } catch (e) {
          throw new Error(`Invalid OCC project. ${e.message}`);
        }

        projectsToRegister.push(folderPath);
      } else {
        const folderPaths = await walkDir(folderPath, { glob: "/**/occ-tools.project.json" });
        await Promise.all(
          folderPaths
            .map((folderPath) => resolve(folderPath, ".."))
            .map(async (folderPath) => {
              try {
                await validateOccProject(folderPath);
                projectsToRegister.push(folderPath);
              } catch {}
            })
        );

        if (!projectsToRegister.length) {
          throw new Error("The specified path does not contain any valid OCC project.");
        }
      }

      const projectsRegistry = getProjectsRegistry();

      for (const projectFolderPath of projectsToRegister) {
        await projectsRegistry.registerProject(projectFolderPath);
      }

      Spinner.hide();

      let successMsg = "Project registered successfully.";

      if (registrationType === "multipleProjects") {
        if (projectsToRegister.length === 1) {
          successMsg = `1 project successfully registered.`;
        } else {
          successMsg = `${projectsToRegister.length} projects successfully registered.`;
        }
      }

      TextOutput.show(successMsg);
    } catch (e) {
      Spinner.hide();
      TextOutput.show(colors.danger(`Cannot register project(s). ${e.message}`));
    }
  }

  static get definition() {
    return {
      name: "register",
      description: "Register an OCC project.",
    };
  }
}

module.exports = RegisterProjectCommand;
