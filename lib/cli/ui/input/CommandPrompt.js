const { join } = require("path");
const { exists, readJson, outputJson } = require("fs-extra");
const { symbols, green, red, yellow, dim, bold } = require("ansi-colors");
const {
  cursorTo,
  eraseDown,
  cursorDown,
  cursorHide,
  cursorShow,
  cursorSavePosition,
  cursorRestorePosition,
} = require("ansi-escapes");

const { getHomePath } = require("../../settings");
const { keyMapStack } = require("../../key-map/registration");
const { getCandidates } = require("../../command/completion");
const { executionContext } = require("../../../cli/execution-context");
const {
  InputElementLine,
  InputElementStatus,
  InputElementCompletion,
  InputElementLineHeader,
  InputElementLineContent,
} = require("../input");

const _historyFilePath = join(getHomePath(), "command-history.json");

class CommandPromptLineHeader extends InputElementLineHeader {
  constructor(output, status) {
    super(output);
    this._status = status;
  }

  _getPrefix() {
    let prefix = "occ-tools";

    if (this._status.is(InputElementStatus.Active)) {
      prefix = bold(prefix);
    }

    return prefix;
  }

  _getProjectName() {
    const { project } = executionContext().get();
    const projectName = (project && project.id) || "no-project";
    const color = project && project.id ? green : red;

    if (this._status.is(InputElementStatus.Active)) {
      return color(projectName);
    } else {
      return projectName;
    }
  }

  _getEnvName() {
    const { environment } = executionContext().get();
    const envName = (environment && environment.name) || "no-env";
    const color = environment && environment.name ? green : red;

    if (this._status.is(InputElementStatus.Active)) {
      return color(envName);
    } else {
      return envName;
    }
  }

  _getSeparator() {
    return this._status.is(InputElementStatus.Complete) ? symbols.middot : "$";
  }

  _getOutput() {
    const prefix = this._getPrefix();
    const project = this._getProjectName();
    const env = this._getEnvName();
    const separator = this._getSeparator();

    let output = `${prefix} (${project}|${env}) ${separator} `;

    if (this._status.is(InputElementStatus.Complete)) {
      output = dim(output);
    }

    return output;
  }

  get output() {
    return this._getOutput();
  }
}

class CommandPrompt {
  constructor(options = {}) {
    this._history = [];
    this._historyIdx = -1;
    const input = options.input || process.stdin;
    const output = options.output || process.stdout;
    const status = new InputElementStatus();
    const header = new CommandPromptLineHeader(output, status);
    const content = new InputElementLineContent(output, status, {
      maskOutput: !!options.maskOutput,
    });

    this._input = input;
    this._output = output;
    this._status = status;
    this._lineContent = content;
    this._line = new InputElementLine(output, header, content);
    this._keyMap = {
      tab: () => {
        if (!this._completionInProgress) {
          this._runTabCompletion();
        }
      },
      up: () => this._nextHistoryCandidate(),
      down: () => this._previousHistoryCandidate(),
      left: () => this._lineContent.moveCursorBackward(),
      right: () => this._lineContent.moveCursorForward(),
      home: () => this._lineContent.moveCursorToContentStart(),
      end: () => this._lineContent.moveCursorToContentEnd(),
      backspace: () => this._lineContent.removeCharacterAtLeft(),
      delete: () => this._lineContent.removeCharacterAtRight(),

      "ctrl+c": () => process.exit(0),
      "ctrl+left": () => this._lineContent.moveCursorToPreviousWord(),
      "ctrl+right": () => this._lineContent.moveCursorToNextWord(),
      "ctrl+w": () => this._lineContent.removeWordAtLeft(),
      "ctrl+delete": () => this._lineContent.removeWordAtRight(),
      "ctrl+f": () => {
        // TODO toggle fuzzy finder on command
      },

      __default__: (str) => {
        this._historyIdx = 0;
        this._lineContent.add(str);
      },
    };
  }

  async _loadCmdHistory() {
    if (await exists(_historyFilePath)) {
      this._history = await readJson(_historyFilePath);
    } else {
      this._persistCmdHistory();
    }
  }

  async _persistCmdHistory() {
    await outputJson(_historyFilePath, this._history);
  }

  _nextHistoryCandidate() {
    if (this._historyIdx < this._history.length - 1) {
      this._lineContent.set(this._history[++this._historyIdx]);
    } else {
      this._line.blink({ beep: true });
    }
  }

  _previousHistoryCandidate() {
    if (this._historyIdx > 0) {
      this._lineContent.set(this._history[--this._historyIdx]);
    } else if (this._historyIdx === 0) {
      this._lineContent.set("");
      this._historyIdx--;
    } else {
      this._line.blink({ beep: true });
    }
  }

  _showAutocompleteLoadingIndicator() {
    this._output.write(cursorSavePosition);
    this._output.write(cursorDown());
    this._output.write(cursorTo(0));
    this._output.write(eraseDown);
    this._output.write(yellow("Command completion in progress..."));
    this._output.write(cursorRestorePosition);
    this._output.write(cursorHide);
    this._input.pause();
  }

  _hideAutocompleteLoadingIndicator() {
    this._output.write(cursorSavePosition);
    this._output.write(cursorDown());
    this._output.write(cursorTo(0));
    this._output.write(eraseDown);
    this._output.write(cursorRestorePosition);
    this._output.write(cursorShow);
    this._input.resume();
  }

  _fillLineContentWithCompletionResult(selectedCandidate) {
    let formattedCandidate = selectedCandidate;

    if (selectedCandidate.indexOf(" ") !== -1) {
      formattedCandidate = `"${formattedCandidate}"`;
    }

    const tokens = this._lineContent.data.split(" ");
    tokens.splice(tokens.length - 1, 1, formattedCandidate);
    this._lineContent.set(tokens.join(" ") + " ");
  }

  async _runTabCompletion() {
    this._completionInProgress = true;
    const timeoutId = setTimeout(() => {
      this._showAutocompleteLoadingIndicator();
    }, 350);

    const candidates = await getCandidates(this._lineContent.data);

    clearTimeout(timeoutId);
    this._hideAutocompleteLoadingIndicator();

    if (candidates.length === 0) {
      return;
    } else if (candidates.length === 1) {
      this._fillLineContentWithCompletionResult(candidates[0].value.toString());
    } else {
      candidates.sort((c1, c2) => {
        if (c1.value < c2.value) {
          return -1;
        }

        if (c1.value > c2.value) {
          return 1;
        }

        return 0;
      });

      const { candidateChosen, candidateIndex, charLeft } = await new InputElementCompletion(
        this._input,
        this._output,
        this._line,
        candidates,
        { escapingAllowed: true }
      ).show();

      this._line.redraw();

      if (candidateChosen) {
        this._fillLineContentWithCompletionResult(candidates[candidateIndex].value.toString());
      } else {
        if (charLeft) {
          this._lineContent.add(charLeft);
        }
      }
    }

    this._completionInProgress = false;
    this._input.resume();
  }

  async _promptComplete() {
    keyMapStack.pop();

    this._status.setTo(InputElementStatus.Complete);
    this._line.redraw();
    this._output.write("\n");
    this._history.unshift(this._lineContent.data.trim());

    if (this._history.length > 80) {
      this._history = this._history.slice(0, 80);
    }

    await this._persistCmdHistory();
  }

  getNextCommand() {
    return new Promise((resolve) => {
      keyMapStack.push(
        Object.assign({}, this._keyMap, {
          return: () => {
            if (!this._lineContent.data.length) {
              this._line.blink({ beep: true });
            } else {
              this._input.pause();
              this._promptComplete().then(() => resolve(this._lineContent.data));
            }
          },
        })
      );

      this._loadCmdHistory().then(() => {
        this._line.redraw();
        this._input.resume();
      });
    });
  }
}

module.exports = CommandPrompt;
