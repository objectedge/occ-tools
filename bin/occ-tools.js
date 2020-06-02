#!/usr/bin/env node
const parseArguments = require("minimist");

const { CliMode } = require("../lib/cli/mode");
const { loadCommands } = require("../lib/commands");
const { loadSettings } = require("../lib/cli/settings");
const { executionContext } = require("../lib/cli/execution-context");
const { runCliApplication } = require("../lib/cli");
const { getProjectsRegistry } = require("../lib/cli/project/registry");

// TODO: add better error handling here
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// TODO: add better error handling here
process.on("uncaughtException", (err, origin) => {
  console.error(`Caught exception: ${err}\n` + `Exception origin: ${origin}`);
  process.exit(1);
});

async function main() {
  const args = parseArguments(process.argv.slice(2));

  await loadSettings();
  await loadCommands();
  await getProjectsRegistry().init();

  try {
    await executionContext().load();
  } catch {
    await executionContext().init();
  }

  await runCliApplication(args.run ? CliMode.STANDALONE : CliMode.REPL, args);
}

main();
