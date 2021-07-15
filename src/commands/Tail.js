var util = require('util');
var Cmdln = require('cmdln').Cmdln;

var ServerSideExtension = require('../core/server-side-extension');

function Tail() {
  Cmdln.call(this, {
    name: 'occ-tools tail',
    desc: 'Make a tail specified by its type.'
  });
}

util.inherits(Tail, Cmdln);

Tail.prototype.do_sse_logs = function(subcmd, options, args, callback) {
  var allowedLevels = ['debug', 'info', 'warning', 'error'];

  if (!allowedLevels.includes(options.level)){
    return callback('The supplied logging level must be one of the following values: debug, info, warning, error.');
  }

  var sse = new ServerSideExtension('adminX');

  sse.tailLogs(options);
};

Tail.prototype.do_sse_logs.help = (
  'Tail the logs from the extension server.\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} [options] \n\n' +
  '{{options}}'
);

Tail.prototype.do_sse_logs.options = [
  {
    names: ['level', 'l'],
    helpArg: '[level]',
    type: 'string',
    default: 'debug',
    help: '(Optional) The logging level (debug, info, warning, error).'
  },
  {
    names: ['date', 'd'],
    helpArg: '[date]',
    type: 'string',
    help: '(Optional) Retrieve the logs from a specific date (format: yyyyMMdd).'
  },
  {
    names: ['interval', 'i'],
    helpArg: '[interval]',
    type: 'number',
    default: 2000,
    help: '(Optional) Interval in milliseconds to fetch new data.'
  }
];


module.exports = Tail;
