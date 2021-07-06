require('./polyfills');

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
