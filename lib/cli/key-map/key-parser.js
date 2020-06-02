const memoize = require("micro-memoize");

const parseKey = memoize(function () {
  let options = {};
  if (typeof arguments[0] === "string") {
    options.keyname = arguments[0];

    if (typeof arguments[1] === "object") {
      options = Object.assign({}, options, arguments[1]);
    }
  } else if (typeof arguments[0] === "object") {
    options = arguments[0];
  } else {
    throw new Error('Unexpected "parseKey" arguments');
  }

  const parsedKey = [];

  if (options.ctrl) {
    parsedKey.push("ctrl");
  }

  if (options.shift) {
    parsedKey.push("shift");
  }

  if (options.meta) {
    parsedKey.push("meta");
  }

  parsedKey.push(options.name);

  return parsedKey.join("+");
});

module.exports = parseKey;
