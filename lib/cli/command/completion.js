const { CommandOption } = require("../command");
const { parseLine, NodeType } = require("../line-parser");
const { getRegisteredCommands, getCommand } = require("./registry");

const NO_CANDIDATES = [];

const _byNodeValue = (astNode) => (candidate) => (candidate.value || candidate).startsWith(astNode.value);

function _isCommandDisabled(commandDefinition) {
  return commandDefinition.isDisabled && commandDefinition.isDisabled();
}

function _getAllCommandCandidates() {
  return getRegisteredCommands()
    .filter((commandName) => commandName.indexOf(":") === -1)
    .filter((commandName) => !_isCommandDisabled(getCommand(commandName).definition))
    .map((commandName) => {
      const CommandClass = getCommand(commandName);
      const commandDefinition = CommandClass.definition;

      return {
        value: commandName,
        description: commandDefinition.description || "Command",
      };
    });
}

function _getAutocompleteContext(commandContext) {
  const positionalParameters = [commandContext.body[0]];

  for (let i = 1; i < commandContext.body.length; i++) {
    if (commandContext.body[i].type !== NodeType.COMMAND_ARGUMENT) {
      break;
    } else {
      positionalParameters.push(commandContext.body[i]);
    }
  }

  for (let i = positionalParameters.length; i > 0; i--) {
    const CommandClass = getCommand(
      positionalParameters
        .slice(0, i)
        .map((p) => p.value)
        .join(":")
    );

    if (CommandClass) {
      return { commandDefinition: CommandClass.definition, index: i - 1 };
    }
  }
}

function _getArgumentPosition(commandContext, autocompleteContext) {
  const commandArgs = autocompleteContext.commandDefinition.args || [];

  if (!commandArgs.length) {
    return -1;
  }

  let argumentPosition = -1;
  const lineContext = commandContext.body.slice(autocompleteContext.index);

  for (let i = 0; i < lineContext.length; i++) {
    if (lineContext[i].type !== NodeType.COMMAND_ARGUMENT) {
      break;
    }

    argumentPosition++;
  }

  return argumentPosition;
}

async function _getCommandArgumentCandidates(line, commandContext, autocompleteContext) {
  const commandSubcommands = autocompleteContext.commandDefinition.subcommands || [];
  const commandArgs = autocompleteContext.commandDefinition.args || [];

  if (commandSubcommands.length) {
    return commandSubcommands
      .filter((s) => !_isCommandDisabled(s.definition))
      .map((s) => {
        const commandDefinition = s.definition;
        return {
          value: commandDefinition.name,
          description: commandDefinition.description || "Subcommand",
        };
      });
  }

  const argumentPosition = _getArgumentPosition(commandContext, autocompleteContext);

  if (argumentPosition === -1 || !commandArgs[argumentPosition] || !commandArgs[argumentPosition].autocomplete) {
    return NO_CANDIDATES;
  }

  const argCandidates = await commandArgs[argumentPosition].autocomplete(line);

  if (argCandidates.length) {
    return argCandidates;
  } else {
    return NO_CANDIDATES;
  }
}

function _getCommandOptionKeyCandidates({ commandDefinition }) {
  const commandOptions = commandDefinition.options || [];
  commandOptions.push(
    new CommandOption({
      name: "help",
      description: "Display help for this command.",
    })
  );

  return commandOptions.map((o) => {
    return { value: `--${o.props.name}`, description: o.props.description };
  });
}

async function _getCommandOptionValueCandidates(line, commandContext, { commandDefinition }) {
  let commandOptionKeyNode = null;

  if (commandContext.body[commandContext.body.length - 1].type === NodeType.COMMAND_OPTION_KEY) {
    commandOptionKeyNode = commandContext.body[commandContext.body.length - 1];
  } else {
    commandOptionKeyNode = commandContext.body[commandContext.body.length - 2];
  }

  if (!commandOptionKeyNode || commandOptionKeyNode.type !== NodeType.COMMAND_OPTION_KEY) {
    return NO_CANDIDATES;
  }

  let beforeLastNodeValue = null;

  if (commandOptionKeyNode.value.startsWith("--")) {
    beforeLastNodeValue = commandOptionKeyNode.value.substring(2);
  } else if (commandOptionKeyNode.value.startsWith("-")) {
    beforeLastNodeValue = commandOptionKeyNode.value.substring(1);
  } else {
    beforeLastNodeValue = commandOptionKeyNode.value;
  }

  const commandOption = (commandDefinition.options || []).find(
    (o) => o.props.name === beforeLastNodeValue || o.props.shortVersion === beforeLastNodeValue
  );

  if (!commandOption || !commandOption.autocomplete) {
    return NO_CANDIDATES;
  }

  const optionCandidates = await commandOption.autocomplete(line);

  return optionCandidates;
}

async function _getCommandContextCandidates(line, commandContext, hasSpaceAtLineEnd) {
  const autocompleteContext = _getAutocompleteContext(commandContext);
  const lastNode = commandContext.body[commandContext.body.length - 1];

  if (
    (!autocompleteContext ||
      !autocompleteContext.commandDefinition ||
      _isCommandDisabled(autocompleteContext.commandDefinition)) &&
    !(lastNode.type === NodeType.COMMAND_INVOCATION && !hasSpaceAtLineEnd)
  ) {
    return NO_CANDIDATES;
  }

  let candidates = null;

  switch (lastNode.type) {
    case NodeType.COMMAND_INVOCATION:
      if (hasSpaceAtLineEnd) {
        candidates = await _getCommandArgumentCandidates(line, commandContext, autocompleteContext);
      } else {
        candidates = _getAllCommandCandidates().filter(_byNodeValue(lastNode));
      }
      break;
    case NodeType.COMMAND_ARGUMENT:
      if (hasSpaceAtLineEnd) {
        candidates = await _getCommandArgumentCandidates(line, commandContext, autocompleteContext);
      } else {
        autocompleteContext.index++;
        candidates = (await _getCommandArgumentCandidates(line, commandContext, autocompleteContext)).filter(
          _byNodeValue(lastNode)
        );
      }
      break;
    case NodeType.COMMAND_OPTION_KEY:
      if (hasSpaceAtLineEnd) {
        candidates = await _getCommandOptionValueCandidates(line, commandContext, autocompleteContext);
      } else {
        candidates = _getCommandOptionKeyCandidates(autocompleteContext)
          .filter((candidate) => {
            for (let i = 0; i < commandContext.body.length; i++) {
              if (commandContext.body[i].value === candidate.value) {
                return false;
              }
            }

            return true;
          })
          .filter(_byNodeValue(lastNode));
      }
      break;
    case NodeType.COMMAND_OPTION_VALUE:
      if (hasSpaceAtLineEnd) {
        candidates = NO_CANDIDATES;
      } else {
        candidates = (await _getCommandOptionValueCandidates(line, commandContext, autocompleteContext)).filter(
          _byNodeValue(lastNode)
        );
      }
      break;
    default:
      candidates = NO_CANDIDATES;
      break;
  }

  return candidates;
}

async function getCandidates(line) {
  const ast = parseLine(line);
  const lastNode = ast.body[ast.body.length - 1];
  const charCode = line.charCodeAt(line.length - 1);
  const hasSpaceAtLineEnd = charCode === 0x09 || charCode === 0x0a || charCode === 0x0d || charCode === 0x20;

  if (!lastNode) {
    return _getAllCommandCandidates();
  }

  if (lastNode.type === NodeType.LOGICAL_OPERATOR) {
    if (!hasSpaceAtLineEnd) {
      return [lastNode.value];
    }

    return _getAllCommandCandidates();
  }

  if (lastNode.type === NodeType.COMMAND_CONTEXT) {
    return _getCommandContextCandidates(line, lastNode, hasSpaceAtLineEnd);
  }
}

module.exports = {
  getCandidates,
};
