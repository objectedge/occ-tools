const TextOutput = require("../ui/output/TextOutput");
const { generateCommandHelpText } = require("./help");

class Command {
  async init() {}

  async execute() {
    this.showHelp();
  }

  showHelp() {
    TextOutput.show(generateCommandHelpText(this.constructor.definition));
  }

  static get definition() {
    return null;
  }
}

class CommandArgument {
  constructor(data = {}) {
    this._autocomplete = data.autocomplete;
    this._validator = data.validator;
    this._props = {
      name: data.name,
      description: data.description || "",
    };
  }

  validateValue(value) {
    if (this._validatorFn) {
      this._validatorFn(value);
    }
  }

  get props() {
    return this._props;
  }

  get autocomplete() {
    return this._autocomplete;
  }
}

class CommandOption {
  constructor(data = {}) {
    this._autocomplete = data.autocomplete;
    this._validator = data.validator;
    this._props = {
      name: data.name,
      shortName: data.shortName,
      description: data.description || "",
    };
  }

  validateValue(value) {
    if (!this._validator) {
      return;
    }

    this._validator(value);
  }

  get props() {
    return this._props;
  }

  get autocomplete() {
    return this._autocomplete;
  }
}

module.exports = {
  Command,
  CommandArgument,
  CommandOption,
};
