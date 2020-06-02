const { join } = require("path");
const { readFile } = require("fs-extra");

const { walkDir } = require("../../../utils/fs");

async function _concatenateLessFiles(rootPath, options) {
  const filePaths = await walkDir(rootPath, options);
  const fileContents = await Promise.all(filePaths.map(async (filePath) => await readFile(filePath)));

  return fileContents.join("\n");
}

/**
 * Concatenate all style source files written in LESS into a single theme styles file.
 * It will recursivelly get all `*.less` files from any subfolders
 *
 * @param {String} lessFilesPath The root folder containing the source files.
 */
async function buildThemeStyles(lessFilesPath) {
  return await _concatenateLessFiles(lessFilesPath, {
    glob: join(lessFilesPath, "!(variables)/*.less"),
  });
}

/**
 * Concatenate all variables files written in LESS into a single theme variables file.
 * It will recursivelly get all `*.less` files that are passed to the function.
 *
 * @param {String} lessFilesPath The root folder containing the source files.
 */
async function buildThemeVariables(lessFilesPath) {
  return await _concatenateLessFiles(lessFilesPath, {
    glob: join(lessFilesPath, "variables/*.less"),
  });
}

module.exports = {
  buildThemeStyles,
  buildThemeVariables,
};
