var util = require('util');
var winston = require('winston');
var prompt = require('prompt');
var colors = require('colors/safe');
var fs = require('fs');
var async = require('async');
var Cmdln = require('cmdln').Cmdln;
var _Configs = require('../core/configs');

function setPromptSchema(schema) {
  Object.keys(schema.properties).forEach(function (propertyKey) {
    var property = schema.properties[propertyKey];
    property.description = colors.green(property.description);
  });
  return schema;
}

var githubTokenCredentials = {
  properties: {
    token: {
      description: colors.green('Github\'s personal access token'),
      required: true
    }
  }
};

function Configs() {
  Cmdln.call(this, {
    name: 'occ-tools configs',
    desc: 'OCC-TOOLS configurations(projects path, env, GitHub credentials...)'
  });
}

util.inherits(Configs, Cmdln);

Configs.prototype.do_init = function(subcmd, opts, args, callback) {
  var occToolsConfigs = new _Configs();
  winston.info('Starting new occ-tools configuration...');

  var schema = setPromptSchema({
    properties: {
      'projects-path': {
        description: 'Projects base path',
        required: true,
        message: 'Please type a Project Base Path'
      },
      'project-name': {
        description: 'Project\'s name',
        required: true,
        message: 'Please type a Project name'
      },
      'project-storefront': {
        description: 'Project\'s storefront',
        required: false,
        default: 'storefront',
        message: 'Please type the project storefront path'
      },
      'project-env': {
        description: 'Project\'s env(Defaults to "dev")',
        required: false,
        default: 'dev'
      },
      'use-mfa-login': {
        type: 'boolean',
        default: true,
        required: false,
        description: 'Use Multi-Factor Authentication?'
      },
      'use-application-key': {
        type: 'boolean',
        default: false,
        required: false,
        description: 'Use Application Key Authentication?'
      },
      'totp-code': {
        required: false,
        default: '123456',
        description: 'Time-based One-Time Password'
      }
    }
  });

  prompt.start();

  prompt.get(schema, function (error, result) {
    if(error) {
      if (error.message === 'canceled') {
        return callback('\nOperation canceled');
      }else {
        return callback(error.message);
      }
    }

    async.waterfall([
      function(cb) {
        prompt.get(githubTokenCredentials, function (error, credentials) {
          if(error) {
            if (error.message === 'canceled') {
              return cb('\nOperation canceled');
            }else {
              return cb(error.message);
            }
          }
          occToolsConfigs.setGithubCredentials({
            token: credentials.token
          }, cb);
        });
      },
      function(cb) {
        occToolsConfigs.setProjectsBasePath(result['projects-path'], cb);
      },
      function (cb) {
        occToolsConfigs.setProject({
          name: result['project-name'],
          env: result['project-env']
        }, cb);
      },
      function(cb) {
        occToolsConfigs.setStorefrontPath(result['project-storefront'], cb);
      },
      function(cb) {
        occToolsConfigs.setProjectMFALogin(result['use-mfa-login'], cb);
      },
      function(cb) {
        occToolsConfigs.setProjectApplicationKeyLogin(result['use-application-key'], cb);
      },
      function(cb) {
        occToolsConfigs.setTotpCode(result['totp-code'], cb);
      }
    ], callback);
  });
};

Configs.prototype.do_init.help = (
  'Initiate a new occ-tools configuration\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} [options] \n\n' +
  '{{options}}'
);

Configs.prototype.do_set_projects_path = function(subcmd, opts, args, callback) {
  var occToolsConfigs = new _Configs();
  var schema = setPromptSchema({
    properties: {
      path: {
        description: 'OCC Projects path',
        required: true,
        message: 'Please type a Project Base Path'
      }
    }
  });

  prompt.start();

  prompt.get(schema, function (error, result) {
    if(error) {
      if (error.message === 'canceled') {
        return callback('\nOperation canceled');
      }else {
        return callback(error.message);
      }
    }

    var projectsPath = result.path;

    try {
      fs.accessSync(projectsPath, fs.F_OK);
    } catch(e) {
      winston.error('Projects path ' + projectsPath + ' doesn\'t exist');
      winston.error('Please try another or create the folder');
      return;
    }

    occToolsConfigs.setProjectsBasePath(projectsPath, callback);
  });
};

Configs.prototype.do_set_projects_path.help = (
  'Set the OCC base projects path, where all your OCC projects are placed at\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} [options] \n\n' +
  '{{options}}'
);

Configs.prototype.do_set_project = function(subcmd, opts, args, callback) {
  var occToolsConfigs = new _Configs();

  var schema = setPromptSchema({
    properties: {
      name: {
        description: 'Project\'s name',
        required: true,
        message: 'Please type a Project name'
      },
      env: {
        description: 'Project\'s env(Defaults to "dev")',
        required: false,
        default: 'dev'
      }
    }
  });

  prompt.start();

  prompt.get(schema, function (error, result) {
    if(error) {
      if (error.message === 'canceled') {
        return callback('\nOperation canceled');
      }else {
        return callback(error.message);
      }
    }

    occToolsConfigs.setProject(result, callback);
  });
};

Configs.prototype.do_set_project.help = (
  'Set an OCC Project\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} [options] \n\n' +
  '{{options}}'
);

Configs.prototype.do_reset_login_token = function(subcmd, opts, args, callback) {
  var occToolsConfigs = new _Configs();
  occToolsConfigs.resetLoginToken(callback);
};

Configs.prototype.do_reset_login_token.help = (
  'Reset login token\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} [options] \n\n' +
  '{{options}}'
);

Configs.prototype.do_set_storefront = function(subcmd, opts, args, callback) {
  var occToolsConfigs = new _Configs();

  var schema = setPromptSchema({
    properties: {
      'project-storefront': {
        description: 'Project\'s storefront',
        required: false,
        default: 'storefront',
        message: 'Please type the project storefront path'
      }
    }
  });

  prompt.start();

  prompt.get(schema, function (error, result) {
    if(error) {
      if (error.message === 'canceled') {
        return callback('\nOperation canceled');
      }else {
        return callback(error.message);
      }
    }

    occToolsConfigs.setStorefrontPath(result['project-storefront'], callback);
  });
};

Configs.prototype.do_set_storefront.help = (
  'Set project storefront folder\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} [options] \n\n' +
  '{{options}}'
);

Configs.prototype.do_set_mfa_login = function(subcmd, opts, args, callback) {
  var occToolsConfigs = new _Configs();

  var schema = setPromptSchema({
    properties: {
      'use-mfa-login': {
        type: 'boolean',
        default: true,
        required: false,
        description: 'Use Multi-Factor Authentication?'
      }
    }
  });

  prompt.start();

  prompt.get(schema, function (error, result) {
    if(error) {
      if (error.message === 'canceled') {
        return callback('\nOperation canceled');
      }else {
        return callback(error.message);
      }
    }

    occToolsConfigs.setProjectMFALogin(result['use-mfa-login'], callback);
  });
};

Configs.prototype.do_set_mfa_login.help = (
  'Set to true or false the Multi-Factor Authentication(MFA)\'s login\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} [options] \n\n' +
  '{{options}}'
);

Configs.prototype.do_use_application_key = function(subcmd, opts, args, callback) {
  var occToolsConfigs = new _Configs();

  var schema = setPromptSchema({
    properties: {
      'use-application-key': {
        type: 'boolean',
        default: true,
        required: false,
        description: 'Use Application Key?'
      }
    }
  });

  prompt.start();

  prompt.get(schema, function (error, result) {
    if(error) {
      if (error.message === 'canceled') {
        return callback('\nOperation canceled');
      }else {
        return callback(error.message);
      }
    }

    occToolsConfigs.setProjectApplicationKeyLogin(result['use-application-key'], callback);
  });
};

Configs.prototype.do_use_application_key.help = (
  'Set to true or false the Application Key Usage for login\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} [options] \n\n' +
  '{{options}}'
);

Configs.prototype.do_set_totp_code = function(subcmd, opts, args, callback) {
  var occToolsConfigs = new _Configs();

  var schema = setPromptSchema({
    properties: {
      'totp-code': {
        required: false,
        default: '123456',
        description: 'Time-based One-Time Password'
      }
    }
  });

  prompt.start();

  prompt.get(schema, function (error, result) {
    if(error) {
      if (error.message === 'canceled') {
        return callback('\nOperation canceled');
      }else {
        return callback(error.message);
      }
    }

    occToolsConfigs.setTotpCode(result['totp-code'], callback);
  });
};

Configs.prototype.do_set_totp_code.help = (
  'Set the Time-based One-Time Password(totp code)\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} [options] \n\n' +
  '{{options}}'
);

Configs.prototype.do_set_env = function(subcmd, opts, args, callback) {
  var occToolsConfigs = new _Configs();
  var schema = setPromptSchema({
    properties: {
      name: {
        description: 'Project\'s env name',
        required: true,
        message: 'Please type a Project environment'
      }
    }
  });

  prompt.start();

  prompt.get(schema, function (error, result) {
    if(error) {
      if (error.message === 'canceled') {
        return callback('\nOperation canceled');
      }else {
        return callback(error.message);
      }
    }

    occToolsConfigs.setEnv(result.name, callback);
  });
};

Configs.prototype.do_set_env.help = (
  'Set an OCC Project Environment\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} [options] \n\n' +
  '{{options}}'
);

Configs.prototype.do_set_user_commands_path = function(subcmd, opts, args, callback) {
  var occToolsConfigs = new _Configs();

  var schema = setPromptSchema({
    properties: {
      'user-commands-path': {
        required: true,
        description: 'User Commands Path'
      }
    }
  });

  prompt.start();

  prompt.get(schema, function (error, result) {
    if(error) {
      if (error.message === 'canceled') {
        return callback('\nOperation canceled');
      }else {
        return callback(error.message);
      }
    }

    occToolsConfigs.setOccToolsCommandsPath(result['user-commands-path'], callback);
  });
};

Configs.prototype.do_set_user_commands_path.help = (
  'Set the path for the occ-tools user commands path\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} [options] \n\n' +
  '{{options}}'
);

Configs.prototype.do_set_env_credentials = function(subcmd, opts, args, callback) {
  var occToolsConfigs = new _Configs();
  var configsJson = occToolsConfigs.getConfigsJSON();
  var currentProject = configsJson.projects.current.name;

  var schema = setPromptSchema({
    properties: {
      env: {
        description: 'Project\'s env name',
        required: true,
        message: 'Please type a Project environment'
      },
      username: {
        description: 'OCC environment username(Enter to keep current)',
        required: false,
        message: 'Please type a your OCC enviroment username'
      },
      password: {
        hidden: true,
        description: 'OCC environment password(Enter to keep current)',
        required: false,
        message: 'Please type a your OCC enviroment password'
      },
      'application-key': {
        description: 'OCC Application Key(Enter to keep current)',
        required: false,
        message: 'Please type a your OCC enviroment application key'
      },
      secret: {
        description: 'OCC Two-factor Authentication (2FA) secret key(Enter to keep current)',
        required: true,
        message: 'Please type a your OCC enviroment 2FA Secret key'
      }
    }
  });

  prompt.start();

  prompt.get(schema, function (error, result) {
    if(error) {
      if (error.message === 'canceled') {
        return callback('\nOperation canceled');
      }else {
        return callback(error.message);
      }
    }

    occToolsConfigs.setEnvCredentials({
      projectName: currentProject,
      env: result.env,
      force: true,
      username: result.username,
      password: result.password,
      'application-key': result['application-key'] || null,
      secret: result.secret
    }, callback);
  });
};

Configs.prototype.do_set_env_credentials.help = (
  'Set an OCC Project Environment credentials\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} [options] \n\n' +
  '{{options}}'
);

Configs.prototype.do_set_github = function(subcmd, opts, args, callback) {
  var occToolsConfigs = new _Configs();

  var schema = setPromptSchema(githubTokenCredentials);

  prompt.start();

  prompt.get(schema, function (error, result) {
    if(error) {
      if (error.message === 'canceled') {
        return callback('\nOperation canceled');
      }else {
        return callback(error.message);
      }
    }

    occToolsConfigs.setGithubCredentials({
      token: result.token
    }, callback);

  });
};

Configs.prototype.do_set_github.help = (
  'Set Github Credentials\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} [options] \n\n' +
  '{{options}}'
);

Configs.prototype.do_configs_path = function(subcmd, opts, args, callback) {
  var occToolsConfigs = new _Configs();
  return occToolsConfigs.getConfigsFilePath(function(configsPath) {
    if(callback) {
      winston.info(configsPath);
      callback(configsPath);
    }
  });
};

Configs.prototype.do_configs_path.help = (
  'Location of occ-tools configurations file\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} [options] \n\n' +
  '{{options}}'
);

module.exports = Configs;
