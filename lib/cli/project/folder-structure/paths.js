const { join } = require("path");

const builtInStructureTypes = require("./structure-types");
const { executionContext } = require("../../execution-context");
const { getRegisteredProjects } = require("..");

function getProjectFolderPath(folderType, options = {}) {
  let project = null;

  if (options.projectId) {
    project = getRegisteredProjects().find((p) => p.id === options.projectId);

    if (!project) {
      throw new Error("Project is not registered.");
    }
  } else {
    const context = executionContext().get();

    if (!context.project) {
      throw new Error("No execution context defined.");
    }

    project = context.project;
  }

  if (!project.folderStructure) {
    throw new Error(`No folder structure definition found on project.`);
  }

  const structureType = project.folderStructure.type;
  let relativeFolderPath = null;

  if (structureType === "custom") {
    relativeFolderPath = project.folderStructure.folders[folderType];
  } else {
    relativeFolderPath = builtInStructureTypes[structureType][folderType];
  }

  if (!relativeFolderPath) {
    throw new Error(`Relative folder path not defined in project for folder type: "${folderType}".`);
  }

  return join(project.path, relativeFolderPath);
}

module.exports = {
  getProjectFolderPath,
};
