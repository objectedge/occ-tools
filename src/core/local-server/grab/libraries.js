const fs = require('fs-extra');
const path = require('path');
const winston = require('winston');
const request = require('request');
const sourceMap = require('source-map');
const config = require('../../config');
const OracleJet = require('./oracle-jet');

let oracleJetVersionDefault = '2.0.2'; //Defaults to 2.0.2, we will double check this inside the extractMainFilesFromSourceMap function
let oracleJetVersion = null;

const oracleLibsDir = path.join(config.dir.instanceDefinitions.oracleLibs);
const allDependencies = [];

class Libraries {
  constructor(options, instance) {
    this.options = options;
    this.instanceOptions = instance.options;
    this.oracleJet = new OracleJet();
  }

  grabAll() {
    return new Promise(async (resolve, reject) => {
      let mainJSRequest;

      try {
        winston.info('Requesting the main page to get the main.js.map file...');
        mainJSRequest = await this.makeRequest(config.endpoints.dns);
      } catch(error) {
        return reject(error);
      }

      let regexPattern = new RegExp(`${config.endpoints.dns}.*main\.js`, 'g');
      let mainJSFilePath = mainJSRequest.body.match(regexPattern);

      if(!mainJSFilePath) {
        return reject('Error on trying to find the main.js file in the main html using the following Regex: ${regexPattern}');
      }

      const mainJSFileMapPath = `${mainJSFilePath[0]}.map`;

      winston.info('Requesting the main.js.map file...');

      try {
        const mainJSMAPRequest = await this.makeRequest(mainJSFileMapPath);
        const sourceMapContent = JSON.parse(mainJSMAPRequest.body);
        await this.extractMainFilesFromSourceMap(sourceMapContent);
        await this.getStoreLibs();
        await this.grabMissingDependencies();
        resolve();
      } catch(error) {
        reject(error);
      }
    });
  }

  makeRequest(url) {
    winston.info(`Requesting ${url}...`);

    const requestConfigs = {
      url : url
    };

    return new Promise((resolve, reject) => {
      request(requestConfigs, (error, response, body) => {
        if(error) {
          return reject(error);
        }

        resolve({ response: response, body: body });
      });
    });
  }

  saveFile(fileContent, destDir) {
    return new Promise((resolve, reject) => {
      fs.writeFile(destDir, fileContent, { encoding: 'utf8' }, function(error) {
        if(error) {
          reject(error);
          return winston.error(error);
        }

        winston.info(`File ${destDir} saved successfully!`);
        allDependencies.push(destDir);
        resolve(destDir);
      });
    });
  }

  grabMissingDependencies() {
    return new Promise(async (resolve, reject) => {
      const extraDependencies = [
        '/shared/js/viewModels/integrationViewModel',
        '/shared/js/viewModels/multiCartViewModel',
        '/shared/js/viewModels/purchaseList',
        '/shared/js/viewModels/purchaseListListing'
      ]

      winston.info('');
      winston.info('Grabbing missing dependencies from the RequireJS configs...');

      let mainJSFile;

      try {
        mainJSFile = await fs.readFile(path.join(oracleLibsDir, 'main.js'), 'utf8');
      } catch(error) {
        return reject(`Error on trying the read the main.js file, please, you need to first get the ${path.join(oracleLibsDir, 'main.js')}`);
      }

      const requireJSConfigRegex = /(?:require\.config\()(\{[\s\S]+?\})\);/g;
      const requireJSConfigsString = mainJSFile.split(requireJSConfigRegex)[1];
      const requireJSConfigs = eval(`module.exports = ${requireJSConfigsString}`);
      const requireJSPaths = requireJSConfigs.paths;

      if(!Object.keys(requireJSPaths).length) {
        return reject(`No Oracle Paths found in ${path.join(oracleLibsDir, 'main.js')}`);
      }

      // Merging extra dependencies
      extraDependencies.forEach(dependency => {
        requireJSPaths[dependency] = dependency;
      });

      let missingDependencies = Object.values(requireJSPaths).filter(function iterateOverPaths(requirePath) {
        if(Array.isArray(requirePath)) {
          return requirePath.every(iterateOverPaths);
        }

        return allDependencies.every(item => path.basename(requirePath) !== path.basename(item, '.js'));
      });

      const filesRequestsPromises = [];

      missingDependencies.forEach(function iterateOverPaths(missingDependencyPath) {
        if(Array.isArray(missingDependencyPath)) {
          return missingDependencyPath.forEach(iterateOverPaths);
        }

        // Don't save the facebook SDK
        if(/connect\.facebook\.net/.test(missingDependencyPath)) {
          return;
        }

        const missingFileURL = `${config.endpoints.dns}${missingDependencyPath}.js`;
        filesRequestsPromises.push(
          new Promise(async (resolve, reject) => {
            try {
              const missingUrlRequest = await this.makeRequest(missingFileURL);

              // File Doesn't exist
              if(/\<\!DOCTYPE html\>/.test(missingUrlRequest.body)) {
                winston.info(`The file ${missingFileURL} doesn't exist.`);
                return resolve();
              }

              const destDir = path.join(oracleLibsDir, `${missingDependencyPath}.js`);

              await fs.ensureDir(path.dirname(destDir));
              await this.saveFile(missingUrlRequest.body, destDir);
              resolve();
            } catch(error) {
              reject(error)
            }
          })
        );
      }.bind(this));

      try {
        await Promise.all(filesRequestsPromises);
        await this.oracleJet.update(oracleJetVersion || oracleJetVersionDefault);
        resolve();
      } catch(error) {
        reject(error);
      }
    });
  }

  getStoreLibs() {
    return new Promise(async (resolve, reject) => {
      let storeLibsRequest;

      try {
        storeLibsRequest = await this.makeRequest(config.endpoints.dns);
      } catch(error) {
        return reject(error);
      }

      let regexPattern = new RegExp(`${config.endpoints.dns}.*store-libs\.js`, 'g');
      let mainJSFilePath = storeLibsRequest.body.match(regexPattern);

      if(!mainJSFilePath) {
        return reject(`Error on trying to find the store-libs.js file in the main html using the following Regex: ${regexPattern}`);
      }

      const mainJSFileMapPath = `${mainJSFilePath[0]}.map`;

      winston.info('Requesting the store-libs.js.map file...');

      try {
        const storeLibsMapRequest = await this.makeRequest(mainJSFileMapPath);
        const sourceMapContent = JSON.parse(storeLibsMapRequest.body);
        await this.extractStoreFilesFromSourceMap(sourceMapContent);
        resolve();
      } catch(error) {
        reject(error);
      }
    });
  }

  extractStoreFilesFromSourceMap(sourceMapContent) {
    return new Promise((resolve, reject) => {
      const saveFilePromises = [];

      sourceMap.SourceMapConsumer.with(sourceMapContent, null, consumer => {
        const sources = consumer.sources;
        sources.forEach(sourcePath => {
          let basePath = path.join(oracleLibsDir, 'shared', 'js');

          if(sourcePath.includes('oraclejet')) {
            basePath = path.join(oracleLibsDir);
          }

          let destDir = path.join(basePath, sourcePath.replace(/\.\.\//g, ''));

          const baseDirName = path.dirname(destDir);
          fs.ensureDirSync(baseDirName);
          saveFilePromises.push(this.saveFile(consumer.sourceContentFor(sourcePath), destDir));
        });
      }).then(async () => {
        try {
          await Promise.all(saveFilePromises);
          resolve();
        } catch(error) {
          reject(error);
        }
      });
    });
  }

  extractMainFilesFromSourceMap(sourceMapContent) {
    return new Promise((resolve, reject) => {
      const saveFilePromises = [];

      sourceMap.SourceMapConsumer.with(sourceMapContent, null, consumer => {
        const sources = consumer.sources;
        sources.forEach(sourcePath => {
          const fileName = path.basename(sourcePath);
          let normalizedSourcePath = sourcePath.replace(/\.\.\//g, '');

          let destDir = path.join(oracleLibsDir, normalizedSourcePath);

          if(fileName !== 'main.js' && !sourcePath.includes('shared')) {
            if(sourcePath.includes('oraclejet')) {
              destDir = path.join(oracleLibsDir, 'js', normalizedSourcePath);

              // Setting Oracle Jet Version
              if(!oracleJetVersion && sourcePath.includes('libs/oj/')) {
                oracleJetVersion = sourcePath.match(/v(.+?)\//)[1];
              }
            }
          }

          const baseDirName = path.dirname(destDir);

          if(fileName !== 'main.js') {
            try {
              fs.ensureDirSync(baseDirName);
            } catch(error) {
              winston.error(error);
            }
          }

          saveFilePromises.push(this.saveFile(consumer.sourceContentFor(sourcePath), destDir));
        });
      }).then(async () => {
        try {
          await Promise.all(saveFilePromises);
          resolve();
        } catch(error) {
          reject(error);
        }
      });
    });
  }
}

module.exports = async function(action, options, callback) {
  const libraries = new Libraries(options, this);

  try {
    switch(action) {
      case 'grab-all':
        callback(null, await libraries.grabAll());
        break;
      default:
        callback();
    }
  } catch(errorResponse) {
    winston.error(errorResponse);
    callback(errorResponse);
  }
};
