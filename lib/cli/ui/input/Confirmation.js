const { cursorHide, cursorShow } = require("ansi-escapes");
const { symbols, green, yellow, dim, bold } = require("ansi-colors");

const { keyMapStack } = require("../../key-map/registration");
const { InputElementLine, InputElementStatus, InputElementLineHeader, InputElementLineContent } = require("../input");

class ConfirmationPromptHeader extends InputElementLineHeader {
  constructor(output, message, defaultAnswer, status) {
    super(output);
    this._status = status;
    this._message = message;
    this._defaultAnswer = defaultAnswer;
  }

  _formatOption(option, defaultAnswer) {
    return option === defaultAnswer ? option.slice(0, 1).toUpperCase() : option.slice(0, 1);
  }

  get output() {
    const prefix = this._status.is(InputElementStatus.Complete) ? green(symbols.check) : yellow(symbols.question);
    const msg = bold(this._message);
    const yes = this._formatOption(Confirmation.Yes, this._defaultAnswer);
    const no = this._formatOption(Confirmation.No, this._defaultAnswer);
    const yesNoIndicator = dim(`(${yes}/${no})`);
    const separator = dim(this._status.is(InputElementStatus.Complete) ? symbols.middot : symbols.pointerSmall);

    return `${prefix} ${msg} ${yesNoIndicator} ${separator} `;
  }
}

class Confirmation {
  constructor(message) {
    const defaultAnswer = typeof arguments[1] === "string" ? arguments[1] : Confirmation.No;
    const options = typeof arguments[1] === "object" ? arguments[1] : arguments[2] || {};
    const input = options.input || process.stdin;
    const output = options.output || process.stdout;
    const status = new InputElementStatus();
    const header = new ConfirmationPromptHeader(output, message, defaultAnswer, status);
    const content = new InputElementLineContent(output, status);

    this._defaultAnswer = defaultAnswer;
    this._input = input;
    this._output = output;
    this._status = status;
    this._lineContent = content;
    this._line = new InputElementLine(output, header, content);
    this._keyMap = {
      up: () => this._toggleResponse(),
      down: () => this._toggleResponse(),
      left: () => this._toggleResponse(),
      right: () => this._toggleResponse(),
      y: () => this._setResponse(Confirmation.Yes),
      n: () => this._setResponse(Confirmation.No),
      "ctrl+c": () => process.exit(0),
    };
  }

  _toggleResponse() {
    const currentResponse = this._lineContent.data;

    if (currentResponse) {
      this._setResponse(currentResponse === Confirmation.Yes ? Confirmation.No : Confirmation.Yes);
    }
  }

  _setResponse(response) {
    this._lineContent.set(response);
  }

  ask() {
    return new Promise((resolve) => {
      keyMapStack.push(
        Object.assign({}, this._keyMap, {
          return: () => {
            this._input.pause();
            this._status.setTo(InputElementStatus.Complete);
            this._line.redraw();
            this._output.write("\n");
            this._output.write(cursorShow);
            keyMapStack.pop();
            resolve(this._lineContent.data === Confirmation.Yes);
          },
        })
      );

      this._line.redraw();
      this._lineContent.set(this._defaultAnswer);
      this._output.write(cursorHide);
      this._input.resume();
    });
  }
}

Confirmation.Yes = "yes";
Confirmation.No = "no";

module.exports = Confirmation;
