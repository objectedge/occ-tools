module.exports = function (command) {
  return function (subCommand, options, args, callback) {
    command(subCommand, options, args)
      .then(() => callback())
      .catch((error) => callback(error));
  };
};
