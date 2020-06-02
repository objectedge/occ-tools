const { join } = require("path");
const { remove } = require("fs-extra");
const { unzipFile, saveReadStreamIntoFile } = require("../../utils/fs");

/**
 * The available logging levels the extension server logger is using.
 */
const LoggerLevels = {
  DEBUG: "debug",
  INFO: "info",
  WARN: "warning",
  ERROR: "error",
};

const _downloadLogsDefaultOptions = {
  loggingLevel: LoggerLevels.DEBUG,
  format: "zip",
};

/**
 * Download the logs from an extension server.
 *
 * @param {*} occClient An OCC client instance.
 * @param {*} destinationFolderPath The destination folder where the logs will be placed to.
 * @param {*} options The available options are:
 * - **loggingLevel** Downloads logs from a specific logging level.
 */
async function downloadLogs(occClient, destinationFolderPath, options = _downloadLogsDefaultOptions) {
  const zipLogFilePath = join(destinationFolderPath, "logs.zip");
  const logFileReadStream = await occClient.getExtensionServerLogs({
    responseType: "stream",
    options: Object.assign({}, _downloadLogsDefaultOptions, options),
  });

  await saveReadStreamIntoFile(logFileReadStream, zipLogFilePath);
  await unzipFile(zipLogFilePath, destinationFolderPath);
  await remove(zipLogFilePath);
}

module.exports = {
  downloadLogs,
  LoggerLevels,
};
