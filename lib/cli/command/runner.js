const parseLine = require("minimist");

const colors = require("../ui/theme");
const TextOutput = require("../ui/output/TextOutput");
const { getCommand, isCommandRegistered } = require("./registry");

function _isCommandDisabled(CommandClass) {
  return CommandClass.definition.isDisabled && CommandClass.definition.isDisabled();
}

const _findCommand = function (commandArgs) {
  if (isCommandRegistered(commandArgs[0])) {
    if (_isCommandDisabled(getCommand(commandArgs[0]))) {
      return { depth: 0, CommandClass: null };
    }
  }

  for (let i = commandArgs.length; i > 0; i--) {
    const commandId = commandArgs.slice(0, i).join(":");

    if (isCommandRegistered(commandId)) {
      const CommandClass = getCommand(commandId);

      if (!_isCommandDisabled(CommandClass)) {
        return { depth: i, CommandClass };
      }
    }
  }

  return { depth: 0, CommandClass: null };
};

function _checkForMissingRequiredArgs(CommandClass, argsPassed) {
  const args = CommandClass.definition.args || [];

  if (!args.length) {
    return [];
  }

  if (args.length !== argsPassed.length) {
    return args.slice(argsPassed.length).map((a) => a.props.name);
  } else {
    return [];
  }
}

function _normalizeOptionKeys(commandOpts) {
  const normalizedOptions = {};

  for (const optionKey of Object.keys(commandOpts)) {
    if (optionKey.indexOf("-") !== -1) {
      const keyTokens = optionKey.split("-");
      const normalizedKey =
        keyTokens[0] +
        keyTokens
          .slice(1)
          .map((t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
          .join("");
      normalizedOptions[normalizedKey] = commandOpts[optionKey];
    } else {
      normalizedOptions[optionKey] = commandOpts[optionKey];
    }
  }

  return normalizedOptions;
}

const _commandInstanceCache = {};

async function runCommand(line) {
  const commandOpts = parseLine(line.trim().split(" "));
  const { depth, CommandClass } = _findCommand(commandOpts._);

  if (!CommandClass) {
    TextOutput.show(colors.danger(`Command "${commandOpts._}" not found.`));
    return;
  }

  const commandId = commandOpts._.slice(0, depth).join(":");
  const commandArgs = commandOpts._.slice(depth).filter((a) => !!a);
  delete commandOpts._;

  let commandInstance = _commandInstanceCache[commandId];
  if (!commandInstance) {
    commandInstance = new CommandClass();
    await commandInstance.init();

    _commandInstanceCache[commandId] = commandInstance;
  }

  if (commandOpts.help != null) {
    commandInstance.showHelp();
  } else {
    const missingArgs = _checkForMissingRequiredArgs(CommandClass, commandArgs);

    if (missingArgs.length) {
      TextOutput.show(colors.danger(`Missing required arguments: ${missingArgs.join(", ")}.`));
      return;
    }

    await commandInstance.execute(...commandArgs, _normalizeOptionKeys(commandOpts));
  }
}

module.exports = {
  runCommand,
};
