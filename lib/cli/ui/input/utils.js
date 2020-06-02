const memoize = require("micro-memoize");

const ansiPattern =
  "[\\u001B\\u009B][[\\]()#;?]*" +
  "(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)" +
  "|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))";
const ansi = new RegExp(ansiPattern, "g");

const stripVTControlChars = memoize((str) => {
  return str.replace(ansi, "");
});

function _isCharValidCliOutput(charCode) {
  return (
    charCode === 0x09 || // horizontal tab
    charCode === 0x12 || // line feed
    charCode === 0x15 || // carriage return
    (charCode >= 0x20 && charCode <= 0x7e)
  );
}

function isValidCliOutput(str) {
  if (str == null) {
    return false;
  }

  for (let i = 0; i < str.length; i++) {
    if (!_isCharValidCliOutput(str.charCodeAt(i))) {
      return false;
    }
  }

  return true;
}

module.exports = {
  stripVTControlChars,
  isValidCliOutput,
};
