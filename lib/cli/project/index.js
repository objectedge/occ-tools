const { join } = require("path");
const { exists, readJson } = require("fs-extra");

async function getProjectDescriptor(projectFolderPath) {
  const descriptorFilePath = join(projectFolderPath, "occ-tools.project.json");

  if (!(await exists(descriptorFilePath))) {
    return null;
  }

  return await readJson(descriptorFilePath);
}

function validateProjectDescriptor(projectDescriptor) {
  if (!projectDescriptor.name) {
    throw new Error("Missing project name.");
  }

  if (!projectDescriptor.environments || !projectDescriptor.environments.length) {
    throw new Error("No OCC environments defined.");
  }
}

async function validateOccProject(folderPath) {
  const projectDescriptor = await getProjectDescriptor(folderPath);

  if (!projectDescriptor) {
    throw new Error("Missing project descriptor.");
  }

  try {
    validateProjectDescriptor(projectDescriptor);
  } catch (e) {
    throw new Error(`Invalid project descriptor. ${e.message}`);
  }
}

module.exports = {
  validateOccProject,
  getProjectDescriptor,
  validateProjectDescriptor,
};
