var glob = require('glob');
var util = require('util');
var Cmdln = require('cmdln').Cmdln;
var fs = require('fs-extra');
var path = require('path');
var winston = require('winston');

var occToolsConfigs = new (require('../../commands/Configs'));
var occToolsConfigPath = occToolsConfigs.do_configs_path();

module.exports = function (done) {
  function initLoading() {
    var OccTools = require('../../commands/OccTools.js');
    var config = require('../config');
    var winston = require('winston');

    function setRemoteGlobalVariable() {
      global.remote = {
        OccTools: OccTools,
        require: function (module) {
          if(/^\.\//.test(module)) {
            return require(path.join(config.occToolsPath, module));
          }

          return require(module);
        },
        config: config,
        getCoreModule: function(moduleName) {
          return require(path.join(__dirname, '..', moduleName));
        },
        getCommandClassModule: function(moduleName) {
          return require(path.join(__dirname, '..', '..', 'commands', moduleName));
        }
      };
    }

    function setUserCommandDefinition(modulePath, done) {
      var modulePackage;

      try {
        modulePackage = fs.readJsonSync(path.join(modulePath, 'package.json'));
      } catch(e) {
        winston.error('The OCC-TOOLS Module ' + modulePath + ' doesn\'t have a package.json file and it is required.');
        winston.error(e);
        return;
      }

      var mainCommandName = modulePackage.name;
      var commandDefinitionIndex = require(modulePath);

      // No sub-commands
      if(typeof commandDefinitionIndex === 'function') {
        OccTools.prototype['do_' + mainCommandName.toLowerCase()] = commandDefinitionIndex;
        return;
      }

      function CommandDefinitionClass() {
        Cmdln.call(this, {
          name: mainCommandName,
          desc: modulePackage.description + ' \x1b[32m[CUSTOM]\x1b[0m'
        });
      };
      util.inherits(CommandDefinitionClass, Cmdln);

      Object.keys(commandDefinitionIndex).forEach(function (commandName) {
        CommandDefinitionClass.prototype['do_' + commandName] = commandDefinitionIndex[commandName].action;

        if(commandDefinitionIndex[commandName].help) {
          CommandDefinitionClass.prototype['do_' + commandName].help = commandDefinitionIndex[commandName].help.trim();
        }

        if(commandDefinitionIndex[commandName].options) {
          CommandDefinitionClass.prototype['do_' + commandName].options = commandDefinitionIndex[commandName].options;
        }
      });

      OccTools.prototype['do_' + mainCommandName.toLowerCase()] = CommandDefinitionClass;
    }

    function loadUserCommands(done) {
      var occToolsUserCommandsPath = config.occToolsUserCommandsPath;

      // Defining global remote
      // it points to the occ-tools instance and passes the require,
      // OccTools and all Configs
      setRemoteGlobalVariable();

      glob(path.join(occToolsUserCommandsPath, '*'))
      .on('match', function (userCommandPath) {
        setUserCommandDefinition(userCommandPath, done);
      })
      .on('end', function () {
        done(OccTools);
      });
    }

    try {
      fs.accessSync(config.occToolsUserCommandsPath, fs.F_OK);
      loadUserCommands(done);
    } catch (e) {
      done(OccTools);
    }
  }

  try {
    fs.accessSync(occToolsConfigPath, fs.F_OK);
    var config = require('../config');

    if(!config.github.token) {
      winston.error('You don\'t have any github configuration. Running set-github...');
      occToolsConfigs.do_set_github(null, null, null, initLoading);
      return;
    }
  } catch(error) {
    occToolsConfigs.do_init(null, null, null, initLoading);
    return;
  }

  initLoading();
};
