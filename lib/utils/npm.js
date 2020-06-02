const shell = require("shelljs");

const { join } = require("path");
const { exists } = require("fs-extra");

shell.config.silent = true;
const INSTALL_OPTIONS = {
  createLockFile: true,
};

/**
 * Install all node modules that are defined on the package.json from
 * the specified folder.
 *
 * @param {String} rootFolderPath The folder where the modules will be installed.
 * @param {Object} options The available options are:
 *
 * - **createLockFile**: Ask NPM to create or not a lock file (default true).
 * - **installOnly**: Possible values are 'prod' which will install only the "dependencies", and
 * "dev" which will install only the "devDependencies" (by default it will install both).
 */
function installNodeModules(rootFolderPath, options = INSTALL_OPTIONS) {
  return new Promise((resolve, reject) => {
    if (!shell.which("npm")) {
      return reject(new Error("NPM executable not found. Make sure you have it installed."));
    }

    exists(join(rootFolderPath, "package.json")).then((exists) => {
      if (!exists) {
        return reject(new Error("package.json file not found on the folder provided."));
      }

      const opts = Object.assign({}, INSTALL_OPTIONS, options);
      let command = "npm install";

      if (opts.installOnly) {
        command += ` --only=${opts.installOnly}`;
      }

      if (!opts.createLockFile) {
        command += " --no-package-lock";
      }

      shell.cd(rootFolderPath);
      shell.exec(command, (code) => {
        if (code !== 0) {
          return reject(new Error("Failed to install extension's NodeJS Modules."));
        }

        return resolve();
      });
    });
  });
}

module.exports = {
  installNodeModules,
};
