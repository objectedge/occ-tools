const path = require('path');
const fs = require('fs-extra');
const winston = require('winston');
const git = require('isomorphic-git');
const { logBox } = require('console-log-it');

function wait(delay) {
  return new Promise(resolve => {
    setTimeout(resolve, delay);
  })
};

module.exports = async function () {
  try {
    const baseOccToolsPath = path.join(__dirname, '..', '..', '..');
    const hash = await git.resolveRef({ fs, dir: baseOccToolsPath, ref: 'master' });
    const packageJsonResponse = await git.readObject({
      fs,
      dir: baseOccToolsPath,
      oid: hash,
      filepath: 'package.json'
    })
    const packageJsonVersion = JSON.parse(Buffer.from(packageJsonResponse.object).toString('utf8')).version;
    const currentVersion = require(path.join(baseOccToolsPath, 'package.json')).version;

    if(currentVersion < packageJsonVersion) {
      logBox({ color: 'yellow', indent: 4, bufferLines: true })(
        'A New OCC TOOLS version is available!',
        '',
        { color: 'red', message: `Your version: ${currentVersion}` },
        { color: 'green', message: `Newer version: ${packageJsonVersion}`},
        '',
        { color: 'blue', message: 'Please run git pull inside the occ-tools and npm install' },
        { color: 'magenta', message: 'Check the changelog in the occ-tools repository.' }
      );

      await wait(2000);
    }
  } catch(error) {
    winston.error(error);
  };
}
