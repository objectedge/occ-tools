var util = require('util');
var winston = require('winston');
var Cmdln = require('cmdln').Cmdln;

var ServerSideExtension = require('../core/server-side-extension');

function Restart() {
  Cmdln.call(this, {
    name: 'restart',
    desc: 'Restarts something.'
  });
}

util.inherits(Restart, Cmdln);

Restart.prototype.do_sse_server = function(subcmd, opts, args, cb) {
  var sse = new ServerSideExtension('adminX');
  sse.on('complete', function(msg) {
    winston.info(msg);
    return cb();
  });
  sse.on('error', function(err) {
    winston.error(err);
    return cb();
  });
  sse.restart();
};

Restart.prototype.do_sse_server.help = (
  'Restarts the server-side extension server\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}}'
);

module.exports = Restart;
