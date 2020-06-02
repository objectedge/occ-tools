const FormData = require("form-data");
const { join } = require("path");
const { remove, exists, emptyDir, copy, createReadStream } = require("fs-extra");

const { installNodeModules } = require("../../utils/npm");
const { walkDir, createZipFile, unzipFile, saveReadStreamIntoFile } = require("../../utils/fs");

const _exclusions = ["node_modules", "__tests__", "jest.config.js", ".prettierrc", "gulpfile.js"];

async function _copySseFilesToFolder(sseFolderPath, sseDistFolderPath) {
  const allFiles = await walkDir(sseFolderPath);
  const filesToCopy = allFiles
    .filter((f) => _exclusions.every((excludedPath) => f.indexOf(excludedPath) === -1))
    .map((f) => f.substring(sseFolderPath.length + 1));

  await Promise.all(
    filesToCopy.map(async (filePath) => {
      await copy(join(sseFolderPath, filePath), join(sseDistFolderPath, filePath));
    })
  );
}

/**
 * Download a server-side extension from the extension server.
 * Note that the destination folder will be emptied as part of the download process.
 *
 * @param {*} occClient An OCC Client.
 * @param {String} sseName The name of the SSE to be downloaded.
 * @param {String} destinationFolderPath The folder where the SSE will be placed to.
 */
async function downloadSse(occClient, sseName, destinationFolderPath) {
  const zipFileName = `${sseName}.zip`;
  const zipFilePath = join(destinationFolderPath, zipFileName);
  const sseFileReadStream = await occClient.doGetSSEFile(zipFileName, { responseType: "stream" });

  await emptyDir(destinationFolderPath);
  await saveReadStreamIntoFile(sseFileReadStream, zipFilePath);
  await unzipFile(zipFilePath, destinationFolderPath);
  await remove(zipFilePath);
}

/**
 * Upload a server-side extension to the extension server. The function
 * will also automatically install the production dependencies into the
 * zip file that will be uploaded without touching the original node_modules
 * folder from the SSE folder.
 *
 * @param {*} occClient An OCC client.
 * @param {String} sseName The name of the server-side extension to be uploaded.
 * @param {String} sseFolderPath The path where the server-side extension is located.
 */
async function uploadSse(occClient, sseName, sseFolderPath) {
  const sseDistFolderPath = join(sseFolderPath, "dist");
  const zipFilePath = join(sseFolderPath, `${sseName}.zip`);

  await emptyDir(sseDistFolderPath);

  if (await exists(zipFilePath)) {
    await remove(zipFilePath);
  }

  await _copySseFilesToFolder(sseFolderPath, sseDistFolderPath);
  await installNodeModules(sseDistFolderPath, { installOnly: "prod", createLockFile: false });
  await createZipFile(sseDistFolderPath, zipFilePath);

  const formData = new FormData();
  formData.append("fileUpload", createReadStream(zipFilePath));
  formData.append("filename", `${sseName}.zip`);
  formData.append("force", "true");
  formData.append("uploadType", "extensions");

  await occClient.doSSEFileUploadMultipart({ data: formData, extraHeaders: formData.getHeaders() });
  await remove(zipFilePath);
  await remove(sseDistFolderPath);
}

async function getInstalledSses(occClient) {
  const { items } = await occClient.listSSEFiles({ offset: 0, limit: 250 });
  return items;
}

module.exports = {
  downloadSse,
  uploadSse,
  getInstalledSses,
};
