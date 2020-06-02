const NodeType = {
  PROMPT_LINE_CONTEXT: "PromptLineContext",
  LOGICAL_OPERATOR: "LogicalOperator",
  COMMAND_CONTEXT: "CommandContext",
  COMMAND_INVOCATION: "CommandInvocation",
  COMMAND_OPTION_KEY: "CommandOptionKey",
  COMMAND_OPTION_VALUE: "CommandOptionValue",
  COMMAND_ARGUMENT: "CommandArgument",
};

const CommandOptionType = {
  FULL: "full",
  SHORT: "short",
};

const LogicalOperator = {
  LOGICAL_AND: "&&",
  LOGICAL_OR: "||",
};

function _getTokenType(token, previousToken) {
  if (token === "&&" || token === "||") {
    return NodeType.LOGICAL_OPERATOR;
  }

  if (!previousToken) {
    return NodeType.COMMAND_INVOCATION;
  }

  if (token.startsWith("-")) {
    return NodeType.COMMAND_OPTION_KEY;
  }

  if (previousToken === "&&" || previousToken === "||") {
    return NodeType.COMMAND_INVOCATION;
  }

  if (previousToken.startsWith("-")) {
    return NodeType.COMMAND_OPTION_VALUE;
  }

  return NodeType.COMMAND_ARGUMENT;
}

function _newCommandContext(contextBody) {
  return {
    start: contextBody[0].start,
    end: contextBody[contextBody.length - 1].end,
    type: NodeType.COMMAND_CONTEXT,
    body: contextBody,
  };
}

function parseLine(line = "") {
  const rawTokens = line.trim().split(" ");
  const parsedLineBody = [];
  let cursorPos = 0;
  let currentCommandContextBody = null;

  for (let i = 0; i < rawTokens.length; i++) {
    if (rawTokens[i]) {
      const nodeType = _getTokenType(rawTokens[i], rawTokens[i - 1]);

      if (nodeType === NodeType.LOGICAL_OPERATOR) {
        parsedLineBody.push(_newCommandContext(currentCommandContextBody));
        parsedLineBody.push({
          start: cursorPos,
          end: cursorPos + rawTokens[i].length,
          type: nodeType,
          value: rawTokens[i],
        });

        currentCommandContextBody = null;
      } else {
        if (nodeType === NodeType.COMMAND_INVOCATION) {
          currentCommandContextBody = [];
        }

        const node = {
          start: cursorPos,
          end: cursorPos + rawTokens[i].length,
          type: nodeType,
          value: rawTokens[i],
        };

        if (nodeType === NodeType.COMMAND_OPTION_KEY) {
          node.optionType = rawTokens[i].startsWith("--") ? CommandOptionType.FULL : CommandOptionType.SHORT;
        }

        currentCommandContextBody.push(node);
      }
    }

    cursorPos += rawTokens[i].length + 1;
  }

  if (currentCommandContextBody) {
    parsedLineBody.push(_newCommandContext(currentCommandContextBody));
  }

  return {
    start: 0,
    end: line.length,
    type: NodeType.PROMPT_LINE_CONTEXT,
    body: parsedLineBody,
  };
}

module.exports = {
  NodeType,
  CommandOptionType,
  LogicalOperator,
  parseLine,
};
