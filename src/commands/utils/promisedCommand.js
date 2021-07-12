module.exports = function (command) {
  return function (subcmd, opts, args, callback) {
    command(subcmd,opts, args)
      .then(() => callback())
      .catch((error) => callback(error));
  };
};
