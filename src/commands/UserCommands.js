var util = require('util');
var path = require('path');
var fs = require('fs-extra');
var glob = require('glob');
var Cmdln = require('cmdln').Cmdln;
var config = require('../core/config');
var prompt = require('prompt');
var winston = require('winston');

function UserCommands() {
  Cmdln.call(this, {
    name: 'occ-tools user-commands',
    desc: 'Commands created by the user'
  });
}

util.inherits(UserCommands, Cmdln);

UserCommands.prototype.do_create = function(subcmd, opts, args, callback) {
  var schema = {
    properties: {
      commandName: {
        pattern: /^[a-z0-9\s\-]+$/,
        message: 'CommandName must be in lowercase only letters, spaces, or dashes',
        required: true
      },
      description: {
        required: true
      },
      email: {
        required: true
      },
      subcmd: {
        type: 'boolean',
        required: false,
        default: true,
        description: 'Generate a command with subcommands'
      }
    }
  };

  prompt.start();

  prompt.get(schema, function (error, result) {
    if(error) {
      if (error.message === 'canceled') {
        return callback('\nOperation canceled');
      }else {
        return callback(error.message);
      }
    }

    var userCustomCommandDir = path.join(config.occToolsUserCommandsPath, result.commandName);

    try {
      fs.accessSync(userCustomCommandDir, fs.F_OK);
      winston.warn('The user\'s command ' + result.commandName + ' has already been created! finishing...');
      callback();
      return;
    } catch (e) {
      fs.ensureDirSync(userCustomCommandDir);
    }

    try {
      var commandTemplatePath = path.join(config.occToolsPath, 'samples', result.subcmd ? 'user-command-template' : 'user-command-template-no-subs');

      fs.copySync(commandTemplatePath, userCustomCommandDir);
      var packageJsonPath = path.join(userCustomCommandDir, 'package.json');
      var modulePackage = fs.readJsonSync(packageJsonPath);
      modulePackage.name = result.commandName;
      modulePackage.description = result.description;
      modulePackage.author = result.email;

      fs.writeJson(packageJsonPath, modulePackage, function (error) {
        if (error) {
          return callback(error);
        }

        winston.info('\n\nCommand "' + result.commandName + '" has been created at "' + userCustomCommandDir + '" successfully!');
        callback();
      });

    } catch(e) {
      callback(e);
    }
  });

  return;
};

UserCommands.prototype.do_create.help = (
  'Create a new command using a scaffold\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} [options] \n\n' +
  '{{options}}'
);

UserCommands.prototype.do_remove = function(subcmd, opts, args, callback) {
  var commandName = args[0];
  var userCustomCommandDir = path.join(config.occToolsUserCommandsPath, commandName);

  try {
    fs.accessSync(userCustomCommandDir, fs.F_OK);
    fs.remove(userCustomCommandDir, function (err) {
      if (err) {
        return callback(err);
      }

      winston.info('Command removed successfully!');
      callback();
    });
  } catch (e) {
    callback('There is no custom user command with the name "' + commandName + '"');
  }
};

UserCommands.prototype.do_remove.help = (
  'Remove a user command\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} [options] \n\n' +
  '{{options}}'
);

UserCommands.prototype.do_path = function(subcmd, opts, args, callback) {
  winston.info('CURRENT PATH: ' + config.occToolsUserCommandsPath);
  callback();
  return;
};

UserCommands.prototype.do_path.help = (
  'will show the current path of all user commands\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} [options] \n\n' +
  '{{options}}'
);

UserCommands.prototype.do_list = function(subcmd, opts, args, callback) {
  glob(path.join(config.occToolsUserCommandsPath, '*'))
  .on('match', function (userCommandPath) {
    try {
      var modulePackage = fs.readJsonSync(path.join(userCommandPath, 'package.json'));
      winston.info('Command: ' + modulePackage.name);
    } catch(e) {
      winston.error(e);
    }
  })
  .on('end',callback);
};

UserCommands.prototype.do_list.help = (
  'will show all created custom commands\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} [options] \n\n' +
  '{{options}}'
);

module.exports = UserCommands;
