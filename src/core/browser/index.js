'use strict';

var launcher = require('@httptoolkit/browser-launcher');
var async = require('async');
var path = require('path');
var url = require('url');
var fs = require('fs-extra');
var winston = require('winston');
var appConfig = require('../config');
var shelljs = require('shelljs');
var isWsl = require('is-wsl');

var PAC_FILE_PATH = appConfig.proxy.pacFile;
var PAC_TEMPLATE_FILE_PATH = path.join(__dirname, 'proxy.template.pac');
var PROXY_PAC_URL = 'http://localhost:' + appConfig.proxy.port + appConfig.proxy.pacUrlPath;

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var wslBrowserConfigsFilePath = path.join(process.env.HOME || process.env.HOMEPATH, '.config', 'browser-launcher', 'config.json');

function configureWSLBrowsers() {
  try {
    fs.accessSync(wslBrowserConfigsFilePath, fs.F_OK);
  } catch (e) {
    fs.outputJsonSync(wslBrowserConfigsFilePath, { browsers: [] }, { spaces: 2 });
  }

  var browsersConfigs = fs.readJsonSync(wslBrowserConfigsFilePath);

  if(browsersConfigs.wslSet) {
    return;
  }

  var wslWindowsUserPath = shelljs.exec('wslpath $(cmd.exe /c "echo %USERPROFILE%")', { silent: true }).stdout.trim();
  var hostWindowsPath = shelljs.exec('cmd.exe /c "echo %HOMEDRIVE%%HOMEPATH%"', { silent: true }).stdout.trim();
  fs.copySync(path.join(__dirname, 'installed-browsers.bat'), path.join(wslWindowsUserPath, 'installed-browsers.bat'));
  var browsersAbsolutPaths = shelljs.exec('cmd.exe /c "' + hostWindowsPath + '\\installed-browsers.bat"', { silent: true }).stdout.trim().replace(/\r/g, '').split(/\n/);
  var defaultConfigsHostPath = hostWindowsPath + '\\.config\\' + 'browser-launcher'; // dont use path.sep here since we are forcing it to be windows like

  var defaultConfigObject = {
    "regex": {},
    "profile": defaultConfigsHostPath,
    "type": "",
    "name": "",
    "command": "",
    "version": "custom"
  }

  if(browsersAbsolutPaths.length) {
    var hasChrome = false;

    browsersConfigs.browsers = [];

    browsersAbsolutPaths.forEach(function(browserPath) {
      var browserName = browserPath.split('\\').reverse()[0].replace('.exe', '');
      winston.info("Browser found: ", browserPath);
      var browserConfig = JSON.parse(JSON.stringify(defaultConfigObject));
      browserConfig.profile = browserConfig.profile + '\\' + browserName;
      browserConfig.type = browserName;
      browserConfig.name = browserName;
      browserConfig.command = browserPath.replace('C:\\', '/mnt/c/').replace(/\\/g, '/');
      browsersConfigs.browsers.push(browserConfig);

      if(browserConfig.name === 'chrome') {
        hasChrome = true;
      }
    });

    browsersConfigs.defaultBrowser = hasChrome ? 'chrome' : browsersConfigs.browsers[0].name;
    browsersConfigs.wslSet = true;
    fs.writeJsonSync(wslBrowserConfigsFilePath, browsersConfigs, { spaces: 2 });
  } else {
    winston.warn("No Browsers have been found. Exiting...");
    return process.exit();
  }
}

var generatePACFile = function (urlEnv, done) {
  var domain = url.parse(urlEnv).hostname;

  async.waterfall([
    function(callback) {
      fs.readFile(PAC_TEMPLATE_FILE_PATH, callback);
    },
    function(pacTemplateSource, callback) {
      var pacTemplateContent = pacTemplateSource.toString('utf8');
      pacTemplateContent = pacTemplateContent.replace(/#PATTERN/m, domain);
      pacTemplateContent = pacTemplateContent.replace(/#IP/m, appConfig.currentIP);

      fs.outputFile(PAC_FILE_PATH, pacTemplateContent, callback);
    }
  ], function (err) {
    if(err) {
      return done(err, null);
    }

    done(null, urlEnv);
  });
};

function Browser(options) {
  this.options = options;

  this.options.defaultFlags = [
    '--auto-open-devtools-for-tabs',
    '--ignore-certificate-errors',
    '--allow-insecure-localhost',
    '--disable-blink-features=BlockCredentialedSubresources',
    '--test-type'
  ];

  EventEmitter.call(this);
}

util.inherits(Browser, EventEmitter);

function getConfigs(browsers, callback) {
  var browser = browsers.filter(function (browser) {
    if(typeof browser.profile === 'string' && browser.profile) {
      return browser.profile;
    }
  })[0];

  var configsFile = isWsl ? wslBrowserConfigsFilePath : path.join(path.dirname(browser.profile), 'config.json');

  fs.readJson(configsFile, function (error, jsonContent) {
    if(error) {
      return callback(true, 'Config File not found: ' + configsFile, configsFile);
    }

    callback(null, jsonContent, configsFile);
  });
}

/**
 * Prints the current environment.
 */
Browser.prototype.launch = function() {
  var self = this;

  if(isWsl) {
    configureWSLBrowsers();
  } else {
    /*
    *  Function made to detect browser, using launcher.detect because it updates every time you install or unninstall browsers.
    *  This returns a json list, which we use to measure just the return size, since we cant return only filter object properties values.
    *
    *  CheckChromeInstalled returns and object list only if chrome is existent, because you cant filter one specific property from the returned list we just check the size.
    */

    launcher.detect(function (available) {
      var checkChromeInstalled = available.filter(function (objectFiltered) { return objectFiltered.name === "chrome" });
      if (checkChromeInstalled.length > 0) {
        return winston.info("Chrome is Installed");
      } else {
        winston.warn("Chrome Not Installed, command will not be executed");
        return process.exit();
      }
    });
  }


  var launchBrowser = function (err, urlEnv) {
    if (err) {
      return self.emit('error', err);
    }

    launcher(function (err, launch) {
      if (err) {
        return self.emit('error', err);
      }

      var flags = self.options.defaultFlags;
      if(self.options.useProxy) {
        flags.push('--proxy-pac-url=' + PROXY_PAC_URL);
      }
      if(self.options.flags) {
        flags = Array.isArray(self.options.flags) ? self.options.flags : self.options.flags.split(',');
      }

      var urlToStart = urlEnv;
      if(/ccadmin/.test(urlEnv) && !self.options.url) {
        urlToStart = urlToStart + '/occs-admin';
      }

      if(self.options.withAuth) {
        urlToStart = urlToStart.replace(/(https?:\/\/)/, '$1' + self.options.withAuth + '@');
      }

      getConfigs(launch.browsers, function(error, jsonContent, configsFile) {
        if(error) {
          return self.emit('error', 'Config File not found: ' + configsFile);
        }
        var defaultBrowser = jsonContent.defaultBrowser;
        var selectedBrowserName = (self.options.browser || defaultBrowser) || 'chrome';

        var currentBrowser = launch.browsers.filter(function (browserObject) {
          return browserObject.name === selectedBrowserName;
        });
        if(currentBrowser.length) {
          currentBrowser = currentBrowser[0];
        }

        var browserOptions = {
          browser: selectedBrowserName,
          options: flags
        };

        winston.info('Starting browser "' + currentBrowser.name + '"');
        winston.info('URL: ' + urlToStart);
        winston.info('Using the following setup:');
        winston.info('Browser: ' + currentBrowser.name);
        winston.info('Version: ' + currentBrowser.version);
        winston.info('Profile: ' + currentBrowser.profile);
        winston.info('Proxy Pac URL: http://' + appConfig.currentIP + ':' + appConfig.proxy.port + appConfig.proxy.pacUrlPath);
        winston.info('Flags: \n' + flags.join(',\n'));

        launch(urlToStart, browserOptions, function (err) {
          if (err) {
            return self.emit('error', err);
          }
          var message = 'The browser "' + currentBrowser.name + '" version ' + currentBrowser.version + ' has been started...';
          if(self.options.browserForProxy) {
            return self.emit('complete', message);
          }
          winston.info(message);
        });
      });
    });
  };

  var urlEnv = null;

  if(self.options.currentEnvName) {
    appConfig.environments.some(function (env) {
      if(env.name === self.options.currentEnvName) {
        urlEnv = env.url;
        return true;
      }
    });

    if(!urlEnv) {
      winston.error('Environment ' + self.options.currentEnvName + ' has not been found! Opening the ' + appConfig.environment.details.url + ' environment');
    }
  }

  if(!urlEnv) {
    urlEnv = appConfig.environment.details.url;
  }

  if(self.options.url) {
    urlEnv = self.options.url;
  }

  generatePACFile(urlEnv, launchBrowser);

};



Browser.prototype.config = function() {
  var self = this;
  var options = self.options;

  launcher(function (err, launch) {
    if (err) {
      return self.emit('error', err);
    }

    if(options.defaultBrowser) {
      var browsers = launch.browsers;
      var currentBrowser = browsers.filter(function(browser) {
        return browser.name === options.defaultBrowser;
      })[0];

      if(!currentBrowser) {
        return self.emit('error', 'No Browser found with ' + options.defaultBrowser);
      }

      getConfigs(browsers, function(error, jsonContent, configsFile) {
        if(error) {
          return self.emit('error', 'Config File not found: ' + configsFile);
        }

        jsonContent.defaultBrowser = options.defaultBrowser;
        fs.writeJSON(configsFile, jsonContent, { spaces: 2 }, function (error) {
          if(error) {
            return self.emit('error', 'Error on updating the config file');
          }

          return self.emit('complete', 'Default browser has been updated successfully to "' + options.defaultBrowser + '"');
        });
      });

      return;
    }
    self.emit('complete', launch.browsers);
  });
};

module.exports = Browser;
