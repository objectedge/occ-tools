const { symbols, green, yellow, dim, bold, cyan, bgBlackBright } = require("ansi-colors");
const {
  beep,
  cursorTo,
  eraseDown,
  cursorUp,
  cursorDown,
  cursorShow,
  cursorHide,
  eraseEndLine,
  cursorForward,
  cursorBackward,
  cursorSavePosition,
  cursorRestorePosition,
} = require("ansi-escapes");

const { keyMapStack } = require("../../key-map/registration");
const { isValidCliOutput } = require("./utils");

class InputElementStatus {
  constructor() {
    this._status = "active";
  }

  setTo(newStatus) {
    this._status = newStatus;
  }

  is(status) {
    return this._status === status;
  }
}

InputElementStatus.Active = "active";
InputElementStatus.Complete = "complete";

class InputElementLineHeader {
  constructor(output) {
    this._output = output;
  }

  get output() {
    return "";
  }

  redraw() {
    this._output.write(this.output);
  }
}

class PromptLineHeader extends InputElementLineHeader {
  constructor(output, message, status) {
    super(output);
    this._status = status;
    this._message = message;
  }

  get output() {
    const prefix = this._status.is(InputElementStatus.Complete) ? green(symbols.check) : yellow(symbols.question);
    const msg = bold(this._message);
    const separator = dim(this._status.is(InputElementStatus.Complete) ? symbols.middot : symbols.pointerSmall);

    return `${prefix} ${msg} ${separator} `;
  }
}

class InputElementLineContent {
  constructor(output, status, options = {}) {
    this._content = "";
    this._cursor = 0;
    this._suggestion = "";
    this._output = output;
    this._status = status;
    this._maskOutput = !!options.maskOutput;
    this._autoSuggestionFn = options.autoSuggestionFn;
    this._suggestionEnabled = !!options.autoSuggestionFn;
  }

  get data() {
    return this._content;
  }

  get output() {
    const content = this._maskOutput ? "*".repeat(this._content.length) : this._content;

    return this._status.is(InputElementStatus.Complete) ? green(content) : content;
  }

  get cursor() {
    return this._cursor;
  }

  set cursor(position) {
    if (position < 0) {
      this._cursor = 0;
    } else if (position > this._content.length) {
      this._cursor = this._content.length;
    } else {
      this._cursor = position;
    }
  }

  redraw() {
    this.moveCursorBackward(this._cursor);
    this._output.write(eraseEndLine);
    this._output.write(this.output);
    this._cursor = this._content.length;
    this._suggestion = "";

    if (this._status.is(InputElementStatus.Active) && this._suggestionEnabled) {
      const suggestion = this._autoSuggestionFn && this._autoSuggestionFn(this._content);

      if (suggestion && suggestion !== this._content) {
        const trailing = suggestion.slice(this._content.length);
        this._output.write(dim(cyan(trailing)));
        this._output.write(cursorBackward(trailing.length));
        this._suggestion = suggestion;
      }
    }
  }

  isShowingSuggestion() {
    return !!this._suggestion;
  }

  applySuggestion() {
    this.add(this._suggestion.slice(this._content.length));
    this._suggestion = "";
  }

  isAutoSuggestionEnabled() {
    return this._suggestionEnabled;
  }

  enableAutoSuggestion() {
    this._suggestionEnabled = true;
  }

  disableAutoSuggestion() {
    this._suggestionEnabled = false;
  }

  set(newContent) {
    if (!isValidCliOutput(newContent)) {
      return;
    }

    this._content = newContent;
    this.redraw();
  }

  add(str) {
    if (!isValidCliOutput(str)) {
      return;
    }

    if (this._cursor === this._content.length) {
      this._content += str;
      this.redraw();
    } else {
      const savedCursorPos = this._cursor + 1;

      this._content = this._content.slice(0, this._cursor) + str + this._content.slice(this._cursor);
      this.redraw();
      this.moveCursorBackward(this._content.length - savedCursorPos);
    }
  }

  moveCursorBackward(amount = 1) {
    if (this._cursor === 0 || amount <= 0) {
      return;
    }

    let amountBackward = amount;
    if (amountBackward > this._cursor) {
      amountBackward = this._cursor;
    }

    this._cursor -= amountBackward;
    this._output.write(cursorBackward(amountBackward));
  }

  moveCursorForward(amount = 1) {
    if (this._cursor === this._content.length || amount <= 0) {
      return;
    }

    let amountForward = amount;
    const maxAmount = this._content.length - this._cursor;

    if (amountForward > maxAmount) {
      amountForward = maxAmount;
    }

    this._cursor += amountForward;
    this._output.write(cursorForward(amountForward));
  }

  moveCursorToContentStart() {
    if (this._cursor > 0) {
      this.moveCursorBackward(this._cursor);
    }
  }

  moveCursorToContentEnd() {
    if (this._cursor < this._content.length) {
      this.moveCursorForward(this._content.length - this._cursor);
    }
  }

  moveCursorToNextWord() {
    if (this._cursor < this._content.length) {
      const trailing = this._content.slice(this._cursor);
      const match = trailing.match(/^(?:\s+|[^\w\s]+|\w+)\s*/);

      this.moveCursorForward(match[0].length);
    }
  }

  moveCursorToPreviousWord() {
    if (this._cursor > 0) {
      const reversedLeading = this._content.slice(0, this._cursor).split("").reverse().join("");
      const match = reversedLeading.match(/^\s*(?:[^\w\s]+|\w+)?/);
      this.moveCursorBackward(match[0].length);
    }
  }

  removeCharacterAtLeft() {
    if (this._cursor > 0) {
      const savedCursorPos = this._cursor - 1;

      this._content = this._content.slice(0, this._cursor - 1) + this._content.slice(this._cursor);
      this.redraw();
      this.moveCursorBackward(this._content.length - savedCursorPos);
    }
  }

  removeCharacterAtRight() {
    if (this._cursor < this._content.length) {
      const savedCursorPos = this._cursor;

      this._content = this._content.slice(0, this._cursor) + this._content.slice(this._cursor + 1);
      this.redraw();
      this.moveCursorBackward(this._content.length - savedCursorPos);
    }
  }

  removeWordAtLeft() {
    if (this._cursor > 0) {
      let leading = this._content.slice(0, this._cursor);
      const reversed = leading.split("").reverse().join("");
      const match = reversed.match(/^\s*(?:[^\w\s]+|\w+)?/);

      leading = leading.slice(0, leading.length - match[0].length);

      this._content = leading + this._content.slice(this._cursor);
      this.redraw();
      this.moveCursorBackward(this._content.length - leading.length);
    }
  }

  removeWordAtRight() {
    if (this._cursor < this._content.length) {
      const savedCursorPos = this._cursor;

      const trailing = this._content.slice(this._cursor);
      const match = trailing.match(/^(?:\s+|\W+|\w+)\s*/);

      this._content = this._content.slice(0, this._cursor) + trailing.slice(match[0].length);
      this.redraw();
      this.moveCursorBackward(this._content.length - savedCursorPos);
    }
  }
}

class InputElementLine {
  constructor(output, header, content) {
    this._output = output;
    this._header = header;
    this._content = content;
  }

  redraw() {
    this._content.cursor = 0;

    this._output.write(cursorTo(0));
    this._output.write(eraseEndLine);
    this._header.redraw();
    this._content.redraw();
  }

  blink(options = {}) {
    return new Promise((resolve) => {
      const header = bgBlackBright(this._header.output);
      const content = bgBlackBright(this._content.output);

      this._output.write(cursorTo(0));
      this._output.write(eraseEndLine);
      this._output.write(header + content);

      if (options.beep) {
        this._output.write(beep);
      }

      setTimeout(() => {
        this.redraw();
        resolve();
      }, 100);
    });
  }
}

const MAX_DRAWING_LENGTH = 120;
const MAX_VISIBLE_CANDIDATES = 10;

class InputElementCompletion {
  constructor(input, output, line, candidates, options = {}) {
    this._candidates = [];
    this._highlightedIndex = 0;
    this._navigationMode = false;
    this._drawingOffset = 0;
    this._line = line;
    this._input = input;
    this._output = output;
    this._candidates = candidates;
    this._escapingAllowed = !!options.escapingAllowed;
    this._keyMap = {
      tab: () => this._highlightNextCandidate(),
      up: () => this._highlightPreviousCandidate(),
      down: () => this._highlightNextCandidate(),
      left: () => this._highlightPreviousCandidate(),
      right: () => this._highlightNextCandidate(),
      pageup: () => {
        this._candidates.length > MAX_VISIBLE_CANDIDATES
          ? this._highlightCandidateAtPreviousPage()
          : this._highlightPreviousCandidate();
      },
      pagedown: () => {
        this._candidates.length > MAX_VISIBLE_CANDIDATES
          ? this._highlightCandidateAtNextPage()
          : this._highlightNextCandidate();
      },
      home: () => this._highlightCandidateAt(0),
      end: () => this._highlightCandidateAt(this._candidates.length - 1),
      "1": () => this._highlightCandidateAt(0),
      "2": () => this._highlightCandidateAt(1),
      "3": () => this._highlightCandidateAt(2),
      "4": () => this._highlightCandidateAt(3),
      "5": () => this._highlightCandidateAt(4),
      "6": () => this._highlightCandidateAt(5),
      "7": () => this._highlightCandidateAt(6),
      "8": () => this._highlightCandidateAt(7),
      "9": () => this._highlightCandidateAt(8),
      "0": () => this._highlightCandidateAt(9),
      // Adding vim-style keybindings
      j: () => this._highlightNextCandidate(),
      k: () => this._highlightPreviousCandidate(),

      "ctrl+c": () => process.exit(0),
    };
  }

  _highlightPreviousCandidate() {
    if (this._highlightedIndex > 0) {
      this._highlightCandidateAt(this._highlightedIndex - 1);
    }
  }

  _highlightNextCandidate() {
    if (this._highlightedIndex < this._candidates.length) {
      this._highlightCandidateAt(this._highlightedIndex + 1);
    }
  }

  _highlightCandidateAtPreviousPage() {
    if (this._highlightedIndex - MAX_VISIBLE_CANDIDATES < 0) {
      this._highlightCandidateAt(0);
    } else {
      this._highlightCandidateAt(this._highlightedIndex - MAX_VISIBLE_CANDIDATES);
    }
  }

  _highlightCandidateAtNextPage() {
    if (this._highlightedIndex + MAX_VISIBLE_CANDIDATES >= this._candidates.length) {
      this._highlightCandidateAt(this._candidates.length - 1);
    } else {
      this._highlightCandidateAt(this._highlightedIndex + MAX_VISIBLE_CANDIDATES);
    }
  }

  _highlightCandidateAt(index) {
    if (index >= 0 && index < this._candidates.length) {
      this._highlightedIndex = index;

      if (this._candidates.length > MAX_VISIBLE_CANDIDATES) {
        if (!(index >= this._drawingOffset && index < this._drawingOffset + MAX_VISIBLE_CANDIDATES)) {
          this._navigationMode = true;
          this._drawingOffset = index - (MAX_VISIBLE_CANDIDATES - 1);
        }

        if (this._drawingOffset < 0) {
          this._drawingOffset = 0;
        } else if (this._drawingOffset > this._candidates.length - MAX_VISIBLE_CANDIDATES) {
          this._drawingOffset = this._candidates.length - MAX_VISIBLE_CANDIDATES;
        }
      }

      this.redraw();
    }
  }

  redraw() {
    this._output.write(cursorTo(0));
    this._output.write(eraseDown);
    this._line.redraw();
    this._output.write(cursorDown());
    this._output.write(cursorTo(0));
    this._drawItems();
  }

  _drawItems() {
    const terminalLength = this._output.columns;
    const drawingLength = terminalLength > MAX_DRAWING_LENGTH ? MAX_DRAWING_LENGTH : terminalLength;
    let cursorCount = MAX_VISIBLE_CANDIDATES;
    let drawingEnd = this._drawingOffset + MAX_VISIBLE_CANDIDATES;

    if (cursorCount > this._candidates.length) {
      cursorCount = this._candidates.length;
    }

    if (drawingEnd > this._candidates.length) {
      drawingEnd = this._candidates.length;
    }

    for (let i = this._drawingOffset; i < drawingEnd; i++) {
      const candidate = this._candidates[i];
      const label = candidate.label || candidate.value || candidate;
      const description = candidate.description || "";
      let line = "";

      if (description) {
        line = label.padEnd(drawingLength - description.length - 2, " ") + dim("(") + yellow(description) + dim(")");
      } else {
        line = label.padEnd(drawingLength, " ");
      }

      this._output.write((this._highlightedIndex === i ? bgBlackBright(line) : line) + "\n");
    }

    if (this._candidates.length > MAX_VISIBLE_CANDIDATES) {
      cursorCount++;
      if (!this._navigationMode) {
        this._output.write(
          bgBlackBright(`...and more ${this._candidates.length - MAX_VISIBLE_CANDIDATES} items`) + "\n"
        );
      } else {
        this._output.write(
          bgBlackBright(
            `item ${this._highlightedIndex + 1} to ${this._drawingOffset + MAX_VISIBLE_CANDIDATES} of ${
              this._candidates.length
            }`
          ) + "\n"
        );
      }
    }

    this._output.write(cursorUp(cursorCount + 1));
  }

  show() {
    return new Promise((resolve) => {
      const extraKeyMap = {
        return: () => {
          this.hide();
          resolve({
            candidateChosen: true,
            candidateIndex: this._highlightedIndex,
            charLeft: null,
          });
        },
      };

      if (this._escapingAllowed) {
        extraKeyMap.__default__ = (str) => {
          this.hide();
          resolve({ candidateChosen: false, candidateIndex: -1, charLeft: str });
        };
      }

      keyMapStack.push(Object.assign({}, this._keyMap, extraKeyMap));

      this._output.write(cursorDown());
      this._output.write(cursorUp());
      this.redraw();
      //      this._output.write(cursorHide);
      this._input.resume();
    });
  }

  hide() {
    this._input.pause();
    this._output.write(cursorSavePosition);
    this._output.write(eraseDown);
    this._output.write(cursorRestorePosition);
    this._output.write(cursorShow);
    keyMapStack.pop();
  }
}

module.exports = {
  InputElementLine,
  PromptLineHeader,
  InputElementStatus,
  InputElementCompletion,
  InputElementLineHeader,
  InputElementLineContent,
};
