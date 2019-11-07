var util = require('util');
var winston = require('winston');
var Cmdln = require('cmdln').Cmdln;

var Index = require('../core/index');
var Publish = require('../core/publish');

function Check() {
  Cmdln.call(this, {
    name: 'check',
    desc: 'Checks a status.'
  });
}

util.inherits(Check, Cmdln);

Check.prototype.do_index = function(subcmd, opts, args, callback) {

  var index = new Index('admin');

  index.on('complete', function(messasge) {
    winston.info(messasge);
    return callback();
  });

  index.on('error', function(error) {
    return callback(error);
  });

  index.status();
};

Check.prototype.do_index.help = (
  'Checks the status of the current/last index on OCC\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}}'
);

Check.prototype.do_publish = function(subcmd, opts, args, callback) {

  var publish = new Publish('admin');

  publish.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  publish.on('error', function(error) {
    return callback(error);
  });

  publish.status();
};

Check.prototype.do_publish.help = (
  'Checks the status of the current/last publish on OCC\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}}'
);

module.exports = Check;
