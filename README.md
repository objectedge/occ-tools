# Summary

This is the CLI version of OCC-TOOLS and intend to make all occ-tools facilities available directly in your terminal.

# Usage

https://github.com/objectedge/occ-tools/wiki

___

# Development version

Use this to debug your occ-tools.

## Requirements

NVM - https://github.com/creationix/nvm

## Installation

- Open a terminal session
- Go to the directory where you have cloned the occ-tools-cli
- Install the nodejs version 13.2+
- Run: `npm install`

## Running

- Open a terminal session and go to the occ-tools-cli directory
- Run: `node index`

## Setting an occ-tools-dev alias

- Open your .bashrc(probably `~/.bashrc`) file with some editor, like vi, vim, nano...
- Insert in your bashrc file the alias `alias occ-tools-dev="node [YOUR_OCC_TOOLS_PATH]/index"`. Replace `[YOUR_OCC_TOOLS_PATH]` with your absolute path to occ-tools-cli.
- Run `source ~/.bashrc`
- Then, you can type `occ-tools-dev` in your terminal when you need to debug something or develop a new feature, fix a bug.



