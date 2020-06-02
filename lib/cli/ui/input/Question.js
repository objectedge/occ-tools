const { keyMapStack } = require("../../key-map/registration");
const { InputElementLine, InputElementStatus, PromptLineHeader, InputElementLineContent } = require("../input");

class Question {
  constructor(message, options = {}) {
    const input = options.input || process.stdin;
    const output = options.output || process.stdout;
    const status = new InputElementStatus();
    const header = new PromptLineHeader(output, message, status);
    const content = new InputElementLineContent(output, status, {
      maskOutput: !!options.maskOutput,
      autoSuggestionFn: (lineContent) => this._autoSuggestion(lineContent),
    });

    this._defaultAnswer = options.defaultAnswer;
    this._input = input;
    this._output = output;
    this._status = status;
    this._lineContent = content;
    this._line = new InputElementLine(output, header, content);
    this._keyMap = {
      left: () => this._lineContent.moveCursorBackward(),
      right: () => {
        if (this._lineContent.isShowingSuggestion()) {
          this._lineContent.applySuggestion();
        } else {
          this._lineContent.moveCursorForward();
        }
      },
      home: () => this._lineContent.moveCursorToContentStart(),
      end: () => {
        if (this._lineContent.isShowingSuggestion()) {
          this._lineContent.applySuggestion();
        } else {
          this._lineContent.moveCursorToContentEnd();
        }
      },
      backspace: () => this._lineContent.removeCharacterAtLeft(),
      delete: () => this._lineContent.removeCharacterAtRight(),

      "ctrl+c": () => process.exit(0),
      "ctrl+left": () => this._lineContent.moveCursorToPreviousWord(),
      "ctrl+right": () => this._lineContent.moveCursorToNextWord(),
      "ctrl+w": () => this._lineContent.removeWordAtLeft(),
      "ctrl+delete": () => this._lineContent.removeWordAtRight(),

      __default__: (str) => this._lineContent.add(str),
    };
  }

  async _autoSuggestion(lineContent) {
    if (this._defaultAnswer) {
      if (lineContent.length === 0 || this._defaultAnswer.startsWith(lineContent)) {
        return this._defaultAnswer;
      }
    }

    return "";
  }

  async _promptComplete() {
    this._input.pause();
    this._status.setTo(InputElementStatus.Complete);
    this._line.redraw();
    this._output.write("\n");
    keyMapStack.pop();
  }

  ask() {
    return new Promise((resolve) => {
      keyMapStack.push(
        Object.assign({}, this._keyMap, {
          return: () => {
            if (!this._lineContent.data.length) {
              if (this._defaultAnswer) {
                this._lineContent.applySuggestion();
                this._promptComplete();
                resolve(this._defaultAnswer);
              } else {
                this._line.blink({ beep: true });
              }
            } else {
              this._promptComplete();
              resolve(this._lineContent.data || this._defaultAnswer);
            }
          },
        })
      );

      this._line.redraw();
      this._input.resume();
    });
  }
}

module.exports = Question;
