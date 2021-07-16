var util = require('util');
var winston = require('winston');
var Cmdln = require('cmdln').Cmdln;
var path = require('path');
var fs = require('fs-extra');
var git = require('isomorphic-git');
const { logBox } = require('console-log-it');
var appConfig = require('../core/config');
var checkVersion = require('../core/configs/version');

git.plugins.set('fs', fs);

var Download = require('./Download.js');
var Upload = require('./Upload.js');
var Generator = require('./Generator.js');
var Completion = require('./Completion.js');
var Proxy = require('./Proxy.js');
var Bundler = require('./Bundler.js');
var Testing = require('./Testing.js');
var Browser = require('./Browser.js');
var Check = require('./Check.js');
var List = require('./List.js');
var Delete = require('./Delete.js');
var Trigger = require('./Trigger.js');
var Upgrade = require('./Upgrade.js');
var Restore = require('./Restore.js');
var UserCommands = require('./UserCommands.js');
var Compile = require('./Compile.js');
var Configs = require('./Configs.js');
var Restart = require('./Restart.js');
var Deploy = require('./Deploy.js');
var Instance = require('./Instance.js');
var LocalServer = require('./LocalServer.js');
var Environment = require('../core/env');

function OccTools(logger) {
  this.logger = logger;
  Cmdln.call(this, {
    name: 'occ-tools',
    desc: 'Object Edge tools for tasks automation on Oracle Cloud Commerce platform.',
    options: [
      { names: ['verbose', 'v'], type: 'bool', help: 'Verbose output.' },
      { names: ['help', 'h'], type: 'bool', help: 'Print help and exit.' },
      { name: 'version', type: 'bool', help: 'Print version and exit.' },
      { names: ['totp-code', 'y'], type: 'string', help: 'It will force mfalogin with the provided Totp Code.' },
      { names: ['use-app-key', 'a'], type: 'bool', help: 'Forces the application key usage.' },
    ]
  });
}

util.inherits(OccTools, Cmdln);

function blockCommandsByEnvBranch(args, callback) {
  var allowedCommands = ['version', 'configs', 'list', 'user-commands', 'browser', 'proxy', 'compile', 'generate', 'env', 'totp-code', 'use-app-key'];
  var command = args[0];
  var containsHelpFlag = args.filter(function (arg) {
    return /help|--h/.test(arg);
  });

  if(args.lenght === 1 || containsHelpFlag || !command || allowedCommands.indexOf(command) > -1) {
    return callback();
  }

  var currentProjectDir = appConfig.dir.project_base;
  var currentProjectEnv = appConfig.environments.filter(function (env) {
    return env.name === appConfig.environment.current;
  })[0];

  if(!currentProjectEnv) {
    winston.error(`Environment ${appConfig.environment.current} not found!`);
    return callback(true);
  }

  var allowedBranch = currentProjectEnv.branch;

  // If it doesn't have the branch property in the occ-tools.project.json file
  // doesn't do anything
  if(!allowedBranch) {
    return callback();
  }

  var processBranchName = function (branch) {
    if(branch !== allowedBranch) {
      winston.error(`You can't run this command outside the environment branch or in the wrong environment branch.`);
      winston.error(`You are currently trying to use the command "${command}" on the environment "${currentProjectEnv.name}" from the branch "${branch}".`);
      winston.error(`The allowed branch for this operation is "${allowedBranch}"`);
      winston.error(`Please change to "${allowedBranch}" branch and try again.`);
      return callback(true);
    }

    return callback();
  };

  var processBranchError = function (error) {
    winston.error(`Found error on trying to access the branch name!`);
    winston.error(error);
    callback(true);
  };

  git.currentBranch({
    dir: currentProjectDir,
    fullname: false
  })
  .then(processBranchName)
  .catch(processBranchError);
}

OccTools.prototype.init = async function (options, args, callback) {
  var allArgs = Array.prototype.slice.call(arguments);
  var self = this;

  await checkVersion();

  logBox({ padding: 10, symbol: '-' })(`Executing command for: ${appConfig.environment.details.url}(${appConfig.environment.current})`);

  blockCommandsByEnvBranch(args, function (finishProcess) {
    if(finishProcess) {
      return callback(false);
    }

    if (options.version) {
      var packageJson = require('../../package.json');
      winston.info(packageJson.version);
      callback(false);
      return;
    }

    if (options.verbose) {
      self.logger.transports.console.level = 'debug';
    }

    if (options.totp_code) {
      winston.info('Forcing MFA LOGIN using the following TOTP CODE: ' + options.totp_code);
      appConfig.useApplicationKey = false;
      appConfig.useMFALogin = true;
      appConfig.forcedTotpCode = true;
      appConfig.credentials = appConfig.loginCredentialsMFA;
      appConfig.credentials.totp_code = options.totp_code;
    }

    if (options.use_app_key && !options.totp_code) {
      if(!appConfig.environment.details.applicationKey) {
        winston.error('No application key provided, run: occ-tools configs set-env-credentials');
        return callback();
      }
      winston.info('Forcing login with application key...');
      appConfig.useApplicationKey = true;
      appConfig.useMFALogin = false;
      appConfig.credentials = appConfig.loginCredentialsApplicationKey;
    }

    Cmdln.prototype.init.apply(this, allArgs);
  });
};

OccTools.prototype.fini = function (subcmd, error, callback) {
  const skipErrors = ['NoCommand'];

  if (typeof error === 'object' && !skipErrors.includes(error.code)) {
    error.message ? winston.error(error.message) : winston.error(error);
  } else if (typeof error === 'string') {
    winston.error(error);
  }

  callback(subcmd);
};

OccTools.prototype.do_env = function(subcmd, opts, args, callback) {
  var environment = new Environment();

  environment.on('complete', callback);

  environment.on('error', function(err) {
    return callback(err);
  });

  environment.printCurrent(callback);
};

OccTools.prototype.do_env.help = (
  'See the current environment.\n\n'
);

OccTools.prototype.do_version = function(subcmd, opts, args, callback) {
  var packageJson = require('../../package.json');
  winston.info(packageJson.version);
  callback();
};

OccTools.prototype.do_version.help = (
  'Shows the current occ-tools version.\n\n'
);

OccTools.prototype.do_force_update = function(subcmd, opts, args, callback) {
  var libupdatePath = path.join(process.env.HOME || process.env.HOMEPATH, '.libautoupdate');

  fs.lstat(libupdatePath, function (error) {
    if(error && error.code === 'ENOENT') {
      return callback();
    }

    fs.unlink(libupdatePath, function (error) {
      if(error) {
        return callback(error);
      }

      winston.warn('Please run: occ-tools');
      callback();
    });
  });
};

OccTools.prototype.do_force_update.help = (
  'Forces the update. It will set occ-tools to remove the 24hs verification temporarily.\n\n'
);

OccTools.prototype.do_instance = Instance;
OccTools.prototype.do_local_server = LocalServer;
OccTools.prototype.do_deploy = Deploy;
OccTools.prototype.do_download = Download;
OccTools.prototype.do_upload = Upload;
OccTools.prototype.do_generate = Generator;
OccTools.prototype.do_completion = Completion;
OccTools.prototype.do_proxy = Proxy;
OccTools.prototype.do_bundler = Bundler;
OccTools.prototype.do_testing = Testing;
OccTools.prototype.do_browser = Browser;
OccTools.prototype.do_check = Check;
OccTools.prototype.do_list = List;
OccTools.prototype.do_delete = Delete;
OccTools.prototype.do_trigger = Trigger;
OccTools.prototype.do_upgrade = Upgrade;
OccTools.prototype.do_restore = Restore;
OccTools.prototype.do_user_commands = UserCommands;
OccTools.prototype.do_compile = Compile;
OccTools.prototype.do_configs = Configs;
OccTools.prototype.do_restart = Restart;

module.exports = OccTools;
