const ansiEscapes = require("ansi-escapes");

const colors = require("../../theme");
const SpinnerStyle = require("./SpinnerStyle");
const { keyMapStack } = require("../../../key-map/registration");

class Spinner {
  constructor() {
    this.style = process.platform === "win32" ? SpinnerStyle.line : SpinnerStyle.dots;
    this.text = "";
    this._currentFrame = 0;
    this.visible = false;
  }

  _clear() {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
  }

  _frame() {
    const frames = this.style.frames;
    let frame = colors.primary(frames[this._currentFrame]);
    frame = colors.primary(frame);

    this._currentFrame = ++this._currentFrame % frames.length;

    return frame + " " + this.text;
  }

  show() {
    if (!this.visible) {
      keyMapStack.push({ "ctrl+c": () => process.exit(0) });
      process.stdout.write(ansiEscapes.cursorHide);

      this._intervalId = setInterval(() => {
        this._clear();
        process.stdout.write(this._frame());
      }, this.style.interval);

      this.visible = true;
    }
  }

  hide() {
    if (this.visible) {
      keyMapStack.pop();
      clearInterval(this._intervalId);
      this._clear();
      process.stdout.write(ansiEscapes.cursorShow);

      this._currentFrame = 0;
      this.visible = false;
    }
  }
}

const _spinnerInstance = new Spinner();

module.exports = {
  getText() {
    return _spinnerInstance.text;
  },

  setText(newText) {
    _spinnerInstance.text = newText;
  },

  isVisible() {
    return _spinnerInstance.visible;
  },

  show() {
    _spinnerInstance.show();
  },

  hide() {
    _spinnerInstance.hide();
  },
};
