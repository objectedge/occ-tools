const _registry = {};

const _hasSubcommands = (commandDefinition) => commandDefinition.subcommands && commandDefinition.subcommands.length;

function _registerCommandClass(commandId, CommandClass) {
  const commandDefinition = CommandClass.definition;

  if (_registry[commandId]) {
    throw new Error(`Command already registered: ${commandId}`);
  }

  if (_hasSubcommands(commandDefinition)) {
    for (const SubcommandClass of commandDefinition.subcommands) {
      _registerCommandClass(`${commandId}:${SubcommandClass.definition.name}`, SubcommandClass);
    }
  }

  _registry[commandId] = CommandClass;
}

function registerCommand(CommandClass, mode) {
  _registerCommandClass(CommandClass.definition.name, CommandClass);
}

function getRegisteredCommands() {
  return Object.keys(_registry);
}

function getCommand(commandId) {
  return _registry[commandId];
}

function isCommandRegistered(commandId) {
  return !!_registry[commandId];
}

module.exports = {
  getCommand,
  registerCommand,
  isCommandRegistered,
  getRegisteredCommands,
};
