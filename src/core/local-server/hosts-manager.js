const path = require('path');
const winston = require('winston');
const hostileCmd = path.resolve(require.resolve('hostile'), '..', 'bin', 'cmd.js');
const shell = require('shelljs');

class HostsManager {
  constructor(options) {
    this.hostname = options.hostname;
    this.ip = options.ip;
    this.sudoPromptOptions = {
      name: 'Hosts'
    }
  }

  setHosts(log = false) {
    return new Promise((resolve, reject) => {
      if(log) {
        winston.info(`Setting the domain ${this.hostname} in the hosts...`);
      }

      shell.exec(`sudo node ${hostileCmd} set ${this.ip} ${this.hostname}`, { silent: true },
        (code, stdout, stderr) => {
          if(stderr) {
            return reject(stderr);
          }
          resolve();
        }
      );
    });
  }

  unsetHosts(log = false) {
    return new Promise((resolve, reject) => {
      if(log) {
        winston.info(`Unsetting the domain ${this.hostname} in the hosts...`);
      }

      shell.exec(`sudo node ${hostileCmd} remove ${this.hostname}`, { silent: true },
        (code, stdout, stderr) => {
          if(stderr) {
            return reject(stderr);
          }
          resolve();
        }
      );
    });
  }
}

module.exports = HostsManager;
