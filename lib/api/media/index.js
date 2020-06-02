const { readFile } = require("fs-extra");
const { join } = require("path");

const AssetTypes = require("./AssetTypes");
const MediaFolders = require("./MediaFolders");
const { runInParallel } = require("../../utils/async");
const { saveReadStreamIntoFile } = require("../../utils/fs");

const _getMediaFilesInfoDefaultOptions = {
  mediaFolder: MediaFolders.GENERAL,
  assetType: AssetTypes.ALL,
  pageNumber: 1,
  itemsPerPage: 10,
};

/**
 * Get information about all files placed on OCC media. For performance reasons,
 * the function restrict the number of items returned in 10 items per page. This
 * behavior can be controlled by using the **options** parameter.
 *
 * @param {*} occClient An OCC client instance.
 * @param {*} options The available options are:
 * - **mediaFolder** Get info about files from a specific folder.
 * - **assetType** Return only a specific asset. The possible values are `all`, `file` or `folder`.
 * - **pageNumber** Change the results page. Defaults to the first page.
 * - **itemsPerPage** Change the number of results per page (max 250). Defaults to 10 items.
 * - **searchTerm** Return only entries that follows a specific search term.
 * - **sortBy** Sort results by using the form `field:direction` where direction can be `asc` or `desc`.
 */
async function getMediaFilesInfo(occClient, options = _getMediaFilesInfoDefaultOptions) {
  const opts = Object.assign({}, _getMediaFilesInfoDefaultOptions, options);
  const requestOptions = {
    assetType: opts.assetType,
    folder: opts.mediaFolder,
    limit: opts.itemsPerPage,
    offset: (opts.pageNumber - 1) * opts.itemsPerPage,
  };

  if (opts.searchTerm) {
    requestOptions.filter = opts.searchTerm;
  }

  if (opts.sortBy) {
    requestOptions.sort = opts.sortBy;
  }

  const result = await occClient.getFiles({ options: requestOptions });

  return {
    total: result.totalResults,
    files: result.items || [],
  };
}

async function _uploadMediaFile(occClient, fileInfo, options = {}) {
  const fileName = fileInfo.name || fileInfo;
  const filePath = fileInfo.path || fileInfo;
  const fileContent = (await readFile(filePath)).toString("base64");

  const { token } = await occClient.startFileUpload({
    data: { filename: fileName, segments: 1, uploadType: options.mediaFolder },
  });
  const uploadResponse = await occClient.doFileSegmentUpload(token, {
    data: { index: 0, filename: fileName, file: fileContent },
  });

  if (!uploadResponse.success) {
    throw new Error("OCC endpoint returned as not succeded.");
  }
}

const _uploadMediaFilesDefaultOptions = {
  mediaFolder: MediaFolders.GENERAL,
  maxParallelUploads: 5,
};

async function uploadMediaFiles(occClient, filesToUpload, options = _uploadMediaFilesDefaultOptions) {
  const opts = Object.assign({}, _uploadMediaFilesDefaultOptions, options);
  await runInParallel(
    filesToUpload.map((filePath) => () => _uploadMediaFile(occClient, filePath, opts)),
    { limit: opts.maxParallelUploads }
  );
}

async function _downloadMediaFile(occClient, remotePath, destinationPath, options) {
  const destinationFilePath = join(destinationPath, remotePath);
  const fileReadStream = await occClient.doGenericRequest(join("/file", remotePath), {
    responseType: "stream",
    siteId: options.siteId,
  });

  await saveReadStreamIntoFile(fileReadStream, destinationFilePath);
}

const _downloadMediaFilesDefaultOptions = {
  maxParallelUploads: 5,
};

async function downloadMediaFiles(
  occClient,
  filesToDownload,
  destinationPath,
  options = _downloadMediaFilesDefaultOptions
) {
  const opts = Object.assign({}, _downloadMediaFilesDefaultOptions, options);
  await runInParallel(
    filesToDownload.map((filePath) => () => _downloadMediaFile(occClient, filePath, destinationPath, options)),
    { limit: opts.maxParallelUploads }
  );
}

const _deleteMediaFilesDefaultOptions = {
  recursive: false,
};

async function deleteMediaFiles(occClient, filesToRemove, options = {}) {
  const opts = Object.assign({}, _deleteMediaFilesDefaultOptions, options);
  await occClient.deleteFiles({
    data: { deletePaths: filesToRemove, recursive: opts.recursive },
  });
}

module.exports = {
  getMediaFilesInfo,
  uploadMediaFiles,
  downloadMediaFiles,
  deleteMediaFiles,
};
