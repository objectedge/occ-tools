'use strict';

var launcher = require('james-browser-launcher');
var async = require('async');
var path = require('path');
var url = require('url');
var fs = require('fs-extra');
var winston = require('winston');
var appConfig = require('../config');

var PAC_FILE_PATH = appConfig.proxy.pacFile;
var PAC_TEMPLATE_FILE_PATH = path.join(__dirname, 'proxy.template.pac');
var PROXY_PAC_URL = 'http://localhost:' + appConfig.proxy.port + appConfig.proxy.pacUrlPath;

var EventEmitter = require('events').EventEmitter;
var util = require('util');

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

  var configsFile = path.join(path.dirname(browser.profile), 'config.json');

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
        fs.writeJSON(configsFile, jsonContent, function (error) {
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
