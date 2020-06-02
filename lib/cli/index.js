const readline = require("readline");

const appMeta = require("../../package.json");
const parseKey = require("./key-map/key-parser");
const CommandPrompt = require("./ui/input/CommandPrompt");
const WelcomeBanner = require("./ui/output/WelcomeBanner");

const { runCommand } = require("./command/runner");
const { keyMapStack } = require("./key-map/registration");
const { CliMode, setCliMode } = require("./mode");

function _setupStandardCliIo() {
  const { stdin } = process;

  readline.emitKeypressEvents(process.stdin);
  stdin.setRawMode(true);
  stdin.pause();
  stdin.on("keypress", (str, keyInfo) => {
    const key = parseKey(keyInfo);
    const currentKeyMap = keyMapStack.getCurrent();

    if (currentKeyMap[key]) {
      currentKeyMap[key]();
    } else if (currentKeyMap.__default__) {
      currentKeyMap.__default__(str, keyInfo, key);
    }
  });
}

async function runCliApplication(mode, startupArguments) {
  setCliMode(mode);
  _setupStandardCliIo();

  new WelcomeBanner(appMeta.version).show();

  do {
    const line = mode === CliMode.REPL ? await new CommandPrompt().getNextCommand() : startupArguments.run;
    await runCommand(line);
  } while (mode === CliMode.REPL);
}

module.exports = {
  runCliApplication,
};
