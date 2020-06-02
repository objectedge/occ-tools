# OCC Tools

**Important Note: This is still on alpha version, so expect that this version is not stable to use in real, production workflow and also significant changes on the application itself can happen.**

## Overview

OCC Tools was created to help with the development on
[Oracle Commerce Cloud](https://docs.oracle.com/en/cloud/saas/commerce-cloud/index.html) platform. It makes easier to
perform certain development tasks like:

- Uploading/download widgets
- Upload/download themes

And much more! Please check the [User Guide](http://objectedge.github.io/occ-tools/user-guide) for the complete list.

## Installation

To install OCC Tools, run:

```bash
npm install -g occ-tools
```

## Usage

OCC Tools has two modes: normal and interactive mode. The normal mode will execute the command you pass on the args and
then the application will exit. This is the way that OCC tools used to run until version 2.x. To run as normal mode you pass
the command you want to run on the `--execute` (or the short `-e`) option. For example, let's say you want to upload a
widget called `MyWidget`. To do so, run:

```bash
$ occ-tools --execute "widget upload MyWidget"
```

The new (and now default) interactive mode will wait for any commands you enter, execute them, and them go back wait for
new commands, until you explicitly ask it to exit the application. To use this mode just run the command without any
arguments:

```bash
$ occ-tools

# Entering on interactive mode
occ-tools $
```

Using the example above, on interactive mode you just type the command you want:

```bash
occ-tools $ widget upload MyWidget
```

Then the application will execute it and go back to prompt you for more commands.

To exit the application just enter the `exit` command:

```bash
occ-tools $ exit

# Exiting application...

$
```

For more commands and more details, please check the [User Guide](http://objectedge.github.io/occ-tools/user-guide).

## Resources

- [Getting Started](http://objectedge.github.io/occ-tools/getting-started)
- [User Guide](http://objectedge.github.io/occ-tools/user-guide)

## License

OCC Tools is [MIT licensed](./LICENSE).
