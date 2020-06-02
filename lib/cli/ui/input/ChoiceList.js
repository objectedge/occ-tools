const {
  InputElementLine,
  InputElementStatus,
  PromptLineHeader,
  InputElementCompletion,
  InputElementLineContent,
} = require("../input");

class ChoiceList {
  constructor(message, choiceList, options = {}) {
    const input = options.input || process.stdin;
    const output = options.output || process.stdout;
    const status = new InputElementStatus();
    const header = new PromptLineHeader(output, message, status);
    const content = new InputElementLineContent(output, status);

    this._line = new InputElementLine(output, header, content);
    this._input = input;
    this._output = output;
    this._status = status;
    this._choiceList = choiceList;
    this._tabCompletion = new InputElementCompletion(
      input,
      output,
      this._line,
      choiceList.map((c) => c.label)
    );
    this._lineContent = content;
  }

  async _promptComplete() {
    this._input.pause();
    this._status.setTo(InputElementStatus.Complete);
    this._line.redraw();
    this._output.write("\n");
  }

  async ask() {
    this._line.redraw();
    const { candidateIndex } = await this._tabCompletion.show();
    this._lineContent.set(this._choiceList[candidateIndex].label);
    this._promptComplete();

    return this._choiceList[candidateIndex].value;
  }
}

module.exports = ChoiceList;
