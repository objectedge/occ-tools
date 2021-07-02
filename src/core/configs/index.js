var winston = require('winston');
var path = require('path');
var fs = require('fs-extra');
var os = require('os');
var prompt = require('prompt');
var colors = require('colors/safe');
var configsDir = path.join(process.env.HOME || process.env.HOMEPATH, 'occ-tools-cli');
var configsFile = path.join(configsDir, 'config.json');

function setPromptSchema(schema) {
  Object.keys(schema.properties).forEach(function (propertyKey) {
    var property = schema.properties[propertyKey];
    property.description = colors.green(property.description);
  });
  return schema;
}

function removeLoginToken(cb) {
  var TokenStorage = require('../auth/TokenStorage');
  var tokenStorage = new TokenStorage('admin');
  tokenStorage.removeAll(function (error) {
    // Don't need to finish the execution here with callback, only show the error and update the configs
    if(error) {
      winston.error('Error on trying to remove the current token', error);
    }

    cb();
  });
}

function Configs() {}

function updateConfigs(configsJson, optionCommand, cb) {
  fs.writeJson(configsFile, configsJson, { spaces: 2 }, function (error) {
    if (error) {
      winston.error(error);
      cb(error);
      return;
    }

    winston.info(optionCommand + '\'s config updated successfully!');
    cb();
  });
}

Configs.prototype.ensureMainConfigsFile = function (cb) {
  var baseConfigsFile = path.join(__dirname, '../../', 'samples', 'configs-sample.json');

  fs.ensureDir(configsDir, function (error) {
    if(error) {
      winston.error('Error on making sure the configsDir exists', error);
      cb(error);
      return;
    }

    try {
      fs.accessSync(configsFile, fs.F_OK);
      cb(null, fs.readJsonSync(configsFile));
      return;
    } catch(error) {
      winston.debug(error);
    }

    fs.copy(baseConfigsFile, configsFile, function (error) {
      if(error) {
        winston.error('Error creating main config file', error);
        cb(error);
        return;
      }
      cb(null, fs.readJsonSync(configsFile));
    });
  });
};

Configs.prototype.setGithubCredentials = function (options, cb) {
  var self = this;

  self.ensureMainConfigsFile(function(error, configsJson) {
    if(error) {
      cb(error);
      return;
    }

    configsJson.github.token = options.token;
    updateConfigs(configsJson, 'Github', cb);
  });
};

Configs.prototype.setProjectsBasePath = function (basePath, cb) {
  var self = this;

  self.ensureMainConfigsFile(function(error, configsJson) {
    if(error) {
      cb(error);
      return;
    }

    configsJson.projects['base-path'] = basePath;
    updateConfigs(configsJson, 'Projects base path', cb);
  });
};

Configs.prototype.setOccToolsCommandsPath = function (occToolsCommandsPath, cb) {
  var self = this;

  self.ensureMainConfigsFile(function(error, configsJson) {
    if(error) {
      cb(error);
      return;
    }

    configsJson.occToolsUserCommandsPath = occToolsCommandsPath;
    updateConfigs(configsJson, 'OCC Tools Commands Path', cb);
  });
};

Configs.prototype.setProjectMFALogin = function (useMFALogin, cb) {
  var self = this;

  self.ensureMainConfigsFile(function(error, configsJson) {
    if(error) {
      cb(error);
      return;
    }

    configsJson['use-mfa-login'] = useMFALogin;
    removeLoginToken(function () {
      updateConfigs(configsJson, 'Use MFA Login', cb);
    });
  });
};

Configs.prototype.setProjectApplicationKeyLogin = function (useApplicationKey, cb) {
  var self = this;

  self.ensureMainConfigsFile(function(error, configsJson) {
    if(error) {
      cb(error);
      return;
    }

    configsJson['use-application-key'] = useApplicationKey;
    removeLoginToken(function () {
      updateConfigs(configsJson, 'Use Application Key', cb);
    });
  });
};

Configs.prototype.setTotpCode = function (code, cb) {
  var self = this;

  self.ensureMainConfigsFile(function(error, configsJson) {
    if(error) {
      cb(error);
      return;
    }

    configsJson['totp-code'] = code;
    removeLoginToken(function () {
      updateConfigs(configsJson, 'Set TOPT-CODE', cb);
    });
  });
};

Configs.prototype.resetLoginToken = function (cb) {
  var self = this;

  self.ensureMainConfigsFile(function(error, configsJson) {
    if(error) {
      cb(error);
      return;
    }

    removeLoginToken(function () {
      updateConfigs(configsJson, 'Reset Login Token', cb);
    });
  });
};

Configs.prototype.setProject = function (options, cb) {
  var self = this;

  self.ensureMainConfigsFile(function(error, configsJson) {
    if(error) {
      cb(error);
      return;
    }

    if(!configsJson.projects['base-path']) {
      winston.warn('There is no base projects set in your configuration, please run the command "set-projects-path"');
      cb(error);
      return;
    }

    var projectsPath = configsJson.projects['base-path'];
    var projectPath = path.join(projectsPath, options.name);

    try {
      fs.accessSync(projectPath, fs.F_OK);
    } catch(error) {
      winston.error('Project ' + options.name + ' is not present in ' + projectsPath);
      winston.error('Please try another project name');
      cb(error);
      return;
    }

    configsJson.projects.current.path = projectPath;
    configsJson.projects.current.name = options.name;
    updateConfigs(configsJson, 'Project', function (error) {
      if(error) {
        cb(error);
        return;
      }

      self.setEnv(options.env, cb);
    });
  });
};

Configs.prototype.setStorefrontPath = function (storefrontDir, cb) {
  var self = this;

  self.ensureMainConfigsFile(function(error, configsJson) {
    if(error) {
      cb(error);
      return;
    }

    configsJson.projects['storefront-dir'] = storefrontDir;
    updateConfigs(configsJson, 'Projects storefront path', cb);
  });
};

Configs.prototype.setEnv = function (env, cb) {
  var self = this;

  self.ensureMainConfigsFile(function(error, configsJson) {
    if(error) {
      cb(error);
      return;
    }

    if(!configsJson.projects.current.name) {
      winston.warn('There is no project set in your configuration, please run the command "set-project"');
      cb(error);
      return;
    }

    var projectPath = configsJson.projects.current.path;
    var occToolsProjectPathFile = path.join(projectPath, 'occ-tools.project.json');
    var occToolsProjectJson = {};

    try {
      occToolsProjectJson = fs.readJsonSync(occToolsProjectPathFile);
    } catch(error) {
      winston.error('The "occ-tools.project.json" doesn\'t exist at ' + projectPath);
      cb(error);
      return;
    }

    var environments = occToolsProjectJson.environments.filter(function(envItem) {
      if(envItem.name === env) {
        return envItem;
      }
    });

    if(!environments.length) {
      winston.error('There is no environment called "' + env + '" in the "' + occToolsProjectPathFile + '"');
      cb();
      return;
    }

    var environment = environments[0];
    var theme = occToolsProjectJson.theme;

    configsJson.projects.current.env = env;
    configsJson.projects.current.url = environment.url;
    configsJson.projects.current.theme = theme;
    configsJson.projects.current.defaultLocale = occToolsProjectJson.defaultLocale || "en";
    configsJson.projects.current.locales = occToolsProjectJson.locales;

    removeLoginToken(function () {
      updateConfigs(configsJson, 'Environment', function(error) {
        if(error) {
          cb(error);
          return;
        }

        self.setEnvCredentials({
          projectName: configsJson.projects.current.name,
          env: env
        }, cb);
      });
    });
  });
};

Configs.prototype.setEnvCredentials = function (options, cb) {
  var self = this;

  self.ensureMainConfigsFile(function(error, configsJson) {
    if(error) {
      cb(error);
      return;
    }

    var credentials = configsJson.projects.credentials[options.projectName] || {};
    configsJson.projects.credentials[options.projectName] = credentials;

    var envCredentials = credentials[options.env] || {};
    configsJson.projects.credentials[options.projectName][options.env] = envCredentials;

    var getCredentialValue = function(credentialsObject, envCredentials, key) {
      return credentialsObject[key] ? credentialsObject[key] : envCredentials[key];
    };

    var updateCredentials = function(credentialsObject, changeCurrent) {
      envCredentials.username = getCredentialValue(credentialsObject, envCredentials, 'username');
      envCredentials.password = getCredentialValue(credentialsObject, envCredentials, 'password');
      envCredentials['application-key'] = getCredentialValue(credentialsObject, envCredentials, 'application-key');
      envCredentials['secret'] = getCredentialValue(credentialsObject, envCredentials, 'secret');

      if(changeCurrent) {
        configsJson.projects.current.credentials.username = getCredentialValue(credentialsObject, envCredentials, 'username');
        configsJson.projects.current.credentials.password = getCredentialValue(credentialsObject, envCredentials, 'password');
        configsJson.projects.current.credentials['application-key'] = getCredentialValue(credentialsObject, envCredentials, 'application-key');
        configsJson.projects.current.credentials['secret'] = getCredentialValue(credentialsObject, envCredentials, 'secret');
      }

      updateConfigs(configsJson, 'Environment credentials', cb);
    };

    if(!options.force && !envCredentials.username && !envCredentials.password && !envCredentials['application-key'] && !envCredentials['secret']) {
      var schema = setPromptSchema({
        properties: {
          username: {
            description: 'OCC environment username',
            required: true,
            message: 'Please type a your OCC enviroment username'
          },
          password: {
            hidden: true,
            description: 'OCC environment password',
            required: true,
            message: 'Please type a your OCC enviroment password'
          },
          'application-key': {
            description: 'OCC Application Key(Optional)',
            required: false,
            message: 'Please type a your OCC enviroment application key'
          },
          secret: {
            description: 'OCC Two-factor Authentication (2FA) secret key',
            required: true,
            message: 'Please type a your OCC enviroment 2FA Secret key'
          }
        }
      });

      prompt.start();

      prompt.get(schema, function (error, result) {
        if(error) {
          winston.error(error);
          cb(error);
          return;
        }

        updateCredentials(result, true);
      });

      return;
    }

    // changing env
    if(!options.force && ((envCredentials.username && envCredentials.password) || envCredentials['application-key'] || envCredentials['secret'])) {
      updateCredentials({
        username: envCredentials.username,
        password: envCredentials.password,
        'application-key': options['application-key'] || "",
        secret: options.secret || envCredentials.secret
      }, true);
      return;
    }

    // 2FA Secret is required
    if(!envCredentials['secret']) {
      winston.info("You need to set the 2FA secret for this env.\n");

      var schema = setPromptSchema({
        properties: {
          secret: {
            description: 'OCC Two-factor Authentication (2FA) secret key',
            required: true,
            message: 'Please type a your OCC enviroment 2FA Secret key'
          }
        }
      });

      prompt.start();
      prompt.get(schema, function (error, result) {
        if(error) {
          winston.error(error);
          cb(error);
          return;
        }

        updateCredentials(result, true);
      });

      return;
    }

    // forcing the update
    if(options.force) {
      updateCredentials({
        username: options.username,
        password: options.password,
        'application-key': options['application-key'] || "",
        secret: options.secret || envCredentials.secret
      }, true);
      return;
    }

    updateConfigs(configsJson, 'Environment credentials', cb);
  });
};

Configs.prototype.getConfigsFilePath = function (cb) {
  cb = cb || function () {};
  cb(configsFile);
  return configsFile;
};

Configs.prototype.getConfigsDir = function (cb) {
  cb = cb || function () {};
  cb(configsDir);
  return configsDir;
};

Configs.prototype.getConfigsJSON = function (cb) {
  cb = cb || function () {};
  var configsJson;

  try {
    configsJson = fs.readJsonSync(configsFile);
  } catch(error) {
    winston.error('Error on trying to load configsJson file');
    winston.error(error);
    return false;
  }

  cb(configsJson);
  return configsJson;
};

Configs.prototype.getCurrentEnvironments = function (cb) {
  cb = cb || function () {};
  var configsJson;

  try {
    configsJson = fs.readJsonSync(configsFile);
  } catch(error) {
    winston.error('Error on trying to load configsJson file');
    winston.error(error);
    return false;
  }

  var projectPath = configsJson.projects.current.path;
  var occToolsProjectPathFile = path.join(projectPath, 'occ-tools.project.json');
  var occToolsProjectJson = {};

  try {
    occToolsProjectJson = fs.readJsonSync(occToolsProjectPathFile);
  } catch(error) {
    winston.error('The "occ-tools.project.json" doesn\'t exist at ' + projectPath);
    return false;
  }

  cb(occToolsProjectJson.environments);
  return occToolsProjectJson.environments;
};

Configs.prototype.getCurrentIP = function () {
  var ifaces = os.networkInterfaces();
  var addresses = [];

  Object.keys(ifaces).forEach(function (ifname) {
    var alias = 0;

    ifaces[ifname].forEach(function (iface) {
      if ('IPv4' !== iface.family || iface.internal !== false) {
        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        return;
      }

      if (alias >= 1) {
        // this single interface has multiple ipv4 addresses
        addresses.push(iface.address);
      } else {
        // this interface has only one ipv4 adress
        addresses.push(iface.address);
      }
      ++alias;
    });
  });

  return addresses.length > 1 ? '127.0.0.1' : addresses[0];
};

Configs.prototype.getProjectSettings = function (cb) {
  cb = cb || function () {};
  var configsJson;

  try {
    configsJson = fs.readJsonSync(configsFile);
  } catch(error) {
    winston.error('Error on trying to load configsJson file');
    winston.error(error);
    return false;
  }

  var projectPath = configsJson.projects.current.path;
  var occToolsProjectPathFile = path.join(projectPath, 'occ-tools.project.json');
  var occToolsProjectJson = {};

  try {
    occToolsProjectJson = fs.readJsonSync(occToolsProjectPathFile);
  } catch(error) {
    winston.error('The "occ-tools.project.json" doesn\'t exist at ' + projectPath);
    return false;
  }

  var projectSettings = occToolsProjectJson['project-settings'] || {};
  cb(projectSettings);
  return projectSettings;
};

module.exports = Configs;
