const { join } = require("path");
const { outputFile } = require("fs-extra");

/**
 * Download theme files from OCC. It will be downloaded two files: the theme variables and its styles.
 *
 * @param {*} occClient An OCC client instance.
 * @param {String} themeId The ID of the theme to be downloaded.
 * @param {String} destinationFolderPath The folder where the theme files will be placed to.
 */
async function downloadTheme(occClient, themeId, destinationFolderPath) {
  const themeInfo = await occClient.getThemeSource(themeId);

  const variablesFilePath = join(destinationFolderPath, "variables.less");
  const stylesFilePath = join(destinationFolderPath, "styles.less");

  await outputFile(variablesFilePath, themeInfo.variables);
  await outputFile(stylesFilePath, themeInfo.styles);
}

/**
 * Upload theme files into OCC.
 *
 * @param {*} occClient An OCC client instance.
 * @param {String} themeId The ID of the theme to be updated.
 * @param {Object} themeContent The content of the theme consisting on a variables and a styles files.
 */
async function uploadTheme(occClient, themeId, { styles, variables }) {
  await occClient.updateThemeSource(themeId, { data: { variables, styles } });
}

module.exports = {
  downloadTheme,
  uploadTheme,
};
