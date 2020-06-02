const colors = require("ansi-colors");

colors.theme({
  primary: colors.blue,
  success: colors.green,
  info: colors.cyan,
  warning: colors.yellow,
  danger: colors.red,
});

module.exports = colors;
