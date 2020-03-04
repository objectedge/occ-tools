const octokit = require('@octokit/rest')();
const winston = require('winston');
const request = require('request');
const extract = require('extract-zip');
const util = require('util');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const config = require('../config');

const oracleZipPath = path.join(os.tmpdir(), 'oraclejet.zip');
const unzippedPath = path.join(os.tmpdir(), 'oraclejet');

const oracleLibsDir = config.dir.instanceDefinitions.oracleLibs;
const libsOracleJetPath = path.join(oracleLibsDir, 'js', 'oraclejet', 'js', 'libs', 'oj', '%s');

class OracleJet {
  getReleaseIdByTagName(tagName) {
    console.log(`Fetching Oracle Jet Release ${tagName}...`);

    return new Promise((resolve, reject) => {
      const findRelease = async (page = 1) => {
        try {
          const result = await octokit.repos.getReleases({
            owner: 'oracle',
            repo: 'oraclejet',
            page,
            per_page: 30
          });

          if(!result.data.length) {
            return reject('No release found');
          }

          const release = result.data.filter(item => item.tag_name === tagName);

          if(!release.length) {
            return findRelease(page+1);
          }

          resolve(release[0]);
        } catch(error) {
          return reject(error);
        }
      };

      findRelease();
    });
  }

  copyOracleJet(tagName) {
    return new Promise((resolve, reject) => {
      const destDir = util.format(libsOracleJetPath, `v${tagName}`);

      console.log(`Copying files to ${destDir} ...`);

      fs.readdir(unzippedPath, async (error, files) => {
        const rootFolder = files[0];
        const oracleJetPath = path.join(unzippedPath, rootFolder, 'dist', 'js', 'libs', 'oj');

        if(error) {
          return reject(error);
        }

        try {
          await fs.ensureDir(destDir);
          await fs.copy(oracleJetPath, destDir);
          await fs.remove(unzippedPath);
          await fs.remove(oracleZipPath);
          resolve();
        } catch(error) {
          reject(error);
        }
      });
    });
  }

  extractZip(tagName) {
    return new Promise((resolve, reject) => {
      console.log(`Extracting Oracle Jet Zip file...`);

      extract(oracleZipPath, { dir: unzippedPath }, async (error) => {
        if(error) {
          return reject(error);
        }

        try {
          await this.copyOracleJet(tagName);
          resolve();
        } catch(error) {
          reject(error);
        }
      });
    });
  }

  update(tagName) {
    return new Promise(async (resolve, reject) => {
      try {
        const release = await this.getReleaseIdByTagName(tagName);
        const downloadUrl = release.zipball_url;
        console.log(`Downloading release ${tagName}...`);

        request.get({
          headers: {
            'user-agent': 'octokit/rest.js v1.2.3'
          },
          url: downloadUrl
        }).on('response', (response) => {
          const fws = fs.createWriteStream(oracleZipPath);

          response.pipe(fws);
          response.on('response', console.log)
          response.on('end', async () => {
            await this.extractZip(tagName);
            resolve();
          }).on('error', reject);
        }).on('error', reject);
      } catch(error) {
        reject(error);
      }
    });
  }
}

module.exports = OracleJet;
