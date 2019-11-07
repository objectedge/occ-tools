require('./polyfills');

var bugsnag = require('@bugsnag/js');
bugsnag('e75bb42c357b87264fd4e8d1c2866207');

var winston = require('winston');
winston.remove(winston.transports.Console);
var logger = winston.add(winston.transports.Console, {
  prettyPrint: true,
  colorize: true,
  silent: false,
  timestamp: false
});

process.on('uncaughtException', function(error) {
  if (typeof error === 'object' && error.hasOwnProperty('message')) {
    winston.error('Error: ', error.message);
    if (error.hasOwnProperty('stack')) {
      winston.error('Stack: ', error.stack);
    }
  } else if (error) {
    winston.error(error);
  }
});

var cmdln = require('cmdln');
var commandsLoader = require('./core/commandsLoader');

commandsLoader(function (OccTools) {
  cmdln.main(new OccTools(logger));
});
