const CliMode = {
  REPL: "repl",
  STANDALONE: "standalone",
};

let _cliMode = null;

function getCliMode() {
  return _cliMode;
}

function setCliMode(mode) {
  if (!Object.values(CliMode).includes(mode)) {
    throw new Error(`Unknown CLI mode "${mode}" provided.`);
  }

  if (!_cliMode) {
    _cliMode = mode;
  }
}

module.exports = {
  CliMode,
  getCliMode,
  setCliMode,
};
