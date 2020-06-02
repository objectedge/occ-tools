const colors = require("../ui/theme");

const IDENTATION_SIZE = 4;
const LONGEST_STRING_COMPARATION_FN = (s1, s2) => (s1.length > s2.length ? s1 : s2);

function _buildCommandUsage(commandDefinition) {
  let usage = colors.bold("Usage: ") + colors.yellow(commandDefinition.name);

  if (commandDefinition.args) {
    for (const commandArgument of commandDefinition.args) {
      usage += colors.red(` <${commandArgument.props.name}>`);
    }
  }

  if (commandDefinition.subcommands) {
    usage += colors.blue(" {SUBCOMMANDS}");
  }

  if (commandDefinition.options && commandDefinition.options.length) {
    usage += colors.green(" [OPTIONS]");
  }

  return usage;
}

function _buildAvailableArgs(commandDefinition, longestKeyNameLength) {
  let availableArgs = colors.red("Available arguments:");

  for (const commandArgument of commandDefinition.args) {
    availableArgs += "\n";

    const commandArgumentName = commandArgument.props.name.padStart(longestKeyNameLength);
    availableArgs += colors.bold(commandArgumentName.padStart(commandArgumentName.length + IDENTATION_SIZE));

    if (commandArgument.props.description) {
      availableArgs += `: ${commandArgument.props.description}`;
    }
  }

  return availableArgs;
}

function _buildAvailableSubcommands(commandDefinition, longestKeyNameLength) {
  let availableSubcommands = colors.blue("Available subcommands:");

  for (const SubcommandClass of commandDefinition.subcommands) {
    availableSubcommands += "\n";

    const subcommandDefinition = SubcommandClass.definition;
    const subcommandName = subcommandDefinition.name.padStart(longestKeyNameLength);

    availableSubcommands += colors.bold(subcommandName.padStart(subcommandName.length + IDENTATION_SIZE));

    if (subcommandDefinition.description) {
      availableSubcommands += `: ${subcommandDefinition.description}`;
    }
  }

  return availableSubcommands;
}

function _buildAvailableOptions(commandDefinition, longestKeyNameLength) {
  let availableOptions = colors.green("Available options:");

  for (const commandOption of commandDefinition.options) {
    availableOptions += "\n";

    const commandOptionName = commandOption.props.name.padStart(longestKeyNameLength);
    availableOptions += colors.bold(commandOptionName.padStart(commandOptionName.length + IDENTATION_SIZE));

    if (commandOption.props.description) {
      availableOptions += `: ${commandOption.props.description}`;
    }

    // TODO: find a better way to display short options on help
    // if (commandOption.props.shortName) {
    //   availableOptions += ` (short ${bold('-' + commandOption.props.shortName)})`
    // }
  }

  return availableOptions;
}

function _getLongestKeyNameLength(commandDefinition) {
  const longestKeys = [];

  if (commandDefinition.subcommands && commandDefinition.subcommands.length) {
    longestKeys.push(
      commandDefinition.subcommands
        .map((subcommand) => subcommand.definition.name)
        .reduce(LONGEST_STRING_COMPARATION_FN)
    );
  }

  if (commandDefinition.options && commandDefinition.options.length) {
    longestKeys.push(
      commandDefinition.options.map((commandOption) => commandOption.props.name).reduce(LONGEST_STRING_COMPARATION_FN)
    );
  }

  if (commandDefinition.args && commandDefinition.args.length) {
    longestKeys.push(
      commandDefinition.args.map((commandArgument) => commandArgument.props.name).reduce(LONGEST_STRING_COMPARATION_FN)
    );
  }

  return (longestKeys.length && longestKeys.reduce(LONGEST_STRING_COMPARATION_FN).length) || 0;
}

function generateCommandHelpText(commandDefinition) {
  let helpText = "";
  const longestKeyNameLength = _getLongestKeyNameLength(commandDefinition);

  helpText += `${commandDefinition.longDescription || commandDefinition.description}\n\n`;
  helpText += _buildCommandUsage(commandDefinition);

  if (commandDefinition.args && commandDefinition.args.length) {
    helpText += `\n\n${_buildAvailableArgs(commandDefinition, longestKeyNameLength)}`;
  }

  if (commandDefinition.subcommands && commandDefinition.subcommands.length) {
    helpText += `\n\n${_buildAvailableSubcommands(commandDefinition, longestKeyNameLength)}`;
  }

  if (commandDefinition.options && commandDefinition.options.length) {
    helpText += `\n\n${_buildAvailableOptions(commandDefinition, longestKeyNameLength)}`;
  }

  return helpText;
}

module.exports = {
  generateCommandHelpText,
};
