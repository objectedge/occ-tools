const { join } = require("path");
const { exists } = require("fs-extra");

const FolderType = require("./FolderType");
const builtInStructureTypes = require("./structure-types");
const { getProjectDescriptor } = require("../index");

const _supportedStructureTypes = [...Object.keys(builtInStructureTypes), "custom"];

function _validateFolderStructure(folderStructure) {
  if (!_supportedStructureTypes.includes(folderStructure.type)) {
    throw new Error(`Unknown folder structure type "${folderStructure.type}" found on project descriptor.`);
  }

  if (folderStructure.type === "custom" && !folderStructure.folders) {
    throw new Error(`Project has custom folder structure but no definition was found on descriptor.`);
  }
}

async function _identifyFolderStructure(projectFolderPath) {
  const _foldersToCheck = [FolderType.STOREFRONT, FolderType.WIDGETS];

  for (const type of Object.keys(builtInStructureTypes)) {
    const folderStructure = builtInStructureTypes[type];
    const results = await Promise.all(
      _foldersToCheck.map(async (folderType) => {
        return await exists(join(projectFolderPath, folderStructure[folderType]));
      })
    );
    const allPathsExistent = results.reduce((previousResult, currentResult) => previousResult && currentResult);

    if (allPathsExistent) {
      return type;
    }
  }

  throw new Error("Cannot identify the folder structure the project is using.");
}

async function getProjectFolderStructure(projectFolderPath) {
  const projectDescriptor = await getProjectDescriptor(projectFolderPath);

  if (!projectDescriptor) {
    throw new Error("Missing project descriptor.");
  }

  let folderStructure = null;

  if (projectDescriptor.folderStructure) {
    _validateFolderStructure(projectDescriptor.folderStructure);
    folderStructure = projectDescriptor.folderStructure;
  } else {
    const type = await _identifyFolderStructure(projectFolderPath);
    folderStructure = { type };
  }

  return folderStructure;
}

module.exports = {
  getProjectFolderStructure,
};
