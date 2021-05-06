#!/usr/bin/env node
const { spawnSync } = require("child_process");
const { resolve } = require("path");

var args = process.argv.slice(2).map(a => "'"+a+"'");

// Say our "real" entrance script is `app.js`
const cmd = "node --no-warnings " + resolve(__dirname, "app.js");
spawnSync(cmd, args, { stdio: "inherit", shell: true });
