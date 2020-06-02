const fs = require("fs-extra");
const yazl = require("yazl");
const yauzl = require("yauzl");
const picomatch = require("picomatch");
const isValidGlob = require("is-valid-glob");

const { join } = require("path");

/**
 * Save the contents from a readable stream into a file. This function is useful
 * for example for a file download because you can create a read stream instead
 * of loading the file into the memory.
 *
 * @param {*} readableStream The readable stream containing the file content.
 * @param {String} destinationFilePath The destination file path.
 */
function saveReadStreamIntoFile(readableStream, destinationFilePath) {
  return new Promise((resolve, reject) => {
    fs.ensureFile(destinationFilePath)
      .then(() => {
        const writableStream = fs.createWriteStream(destinationFilePath);

        writableStream.on("finish", resolve);
        writableStream.on("error", reject);
        readableStream.pipe(writableStream);
      })
      .catch(reject);
  });
}

async function _walkDir(dirPath) {
  const result = [];
  const entries = await fs.readdir(dirPath);

  await Promise.all(
    entries
      .map((e) => join(dirPath, e))
      .map(async (entry) => {
        const pathInfo = await fs.stat(entry);

        if (pathInfo.isDirectory()) {
          const subEntries = await _walkDir(entry);
          result.push(...subEntries);
        } else {
          result.push(entry);
        }
      })
  );

  return result;
}

/**
 * Walks a directory tree from a specific point on the file system.
 *
 * @param {String} rootPath The root path which will be the starting point for the directory walk
 * @param {Object} options Supported options are:
 *
 * **glob:** will return only the entries that matches the glob pattern.
 *
 * @returns {Array<String>} An array of all entries found.
 */
async function walkDir(rootPath, options = {}) {
  if (options.glob && !isValidGlob(options.glob)) {
    throw new Error(`Invalid glob provided. ${options.glob}`);
  }

  const entries = await _walkDir(rootPath);

  if (options.glob) {
    const doesMatchGlob = picomatch(options.glob);
    return entries.filter((entry) => doesMatchGlob(entry));
  } else {
    return entries;
  }
}

function _openZipFile(zipFilePath) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipFilePath, { lazyEntries: true }, (err, zipFile) => {
      if (err) {
        return reject;
      } else {
        resolve(zipFile);
      }
    });
  });
}

function _readZipFileEntry(zipFile, zipFileEntry) {
  return new Promise((resolve, reject) => {
    zipFile.openReadStream(zipFileEntry, function (err, readStream) {
      if (err) {
        return reject(err);
      } else {
        resolve(readStream);
      }
    });
  });
}

async function _extractZipFileEntry(zipFile, zipFileEntry, destinationFolderPath) {
  const targetPath = join(destinationFolderPath, zipFileEntry.fileName);

  if (/\/$/.test(zipFileEntry.fileName)) {
    await fs.ensureDir(targetPath);
    zipFile.readEntry();
  } else {
    const zipFileReadableStream = await _readZipFileEntry(zipFile, zipFileEntry);

    zipFileReadableStream.once("end", () => zipFile.readEntry());
    await saveReadStreamIntoFile(zipFileReadableStream, targetPath);
  }
}

function _extractZipFileContents(zipFile, destinationFolderPath) {
  return new Promise((resolve, reject) => {
    zipFile.once("end", resolve);
    zipFile.once("error", reject);
    zipFile.on("entry", (entry) => _extractZipFileEntry(zipFile, entry, destinationFolderPath));

    zipFile.readEntry();
  });
}

async function unzipFile(zipFilePath, destinationFolderPath) {
  const zipFile = await _openZipFile(zipFilePath);
  await _extractZipFileContents(zipFile, destinationFolderPath);
}

function createZipFile(folderPath, zipFilePath) {
  return new Promise((resolve, reject) => {
    walkDir(folderPath)
      .then((files) => {
        const zipFile = new yazl.ZipFile();

        for (const filePath of files) {
          zipFile.addFile(filePath, filePath.substring(folderPath.length + 1));
        }

        zipFile.outputStream.pipe(fs.createWriteStream(zipFilePath)).on("close", resolve).on("error", reject);

        zipFile.end();
      })
      .catch(reject);
  });
}

module.exports = {
  walkDir,
  unzipFile,
  createZipFile,
  saveReadStreamIntoFile,
};
