var util = require('util');
var Cmdln = require('cmdln').Cmdln;
var winston = require('winston');

var _Testing = require('../core/testing');

function Testing() {
  Cmdln.call(this, {
    name: 'occ-tools testing',
    desc: 'Run test server.'
  });
}

util.inherits(Testing, Cmdln);

Testing.prototype.do_run = function(subcmd, opts, args, callback) {
  var testing = new _Testing(opts);

  testing.on('complete', function() {
    return callback();
  });

  testing.on('error', function(error) {
    return callback(error);
  });

  testing.run();
};

Testing.prototype.do_run.help = (
  'Test widget\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <widgetName> [options] \n\n' +
  '{{options}}'
);

Testing.prototype.do_run.options = [
  {
    names: ['widgetName', 'wd'],
    helpArg: '[widgetName]',
    type: 'string',
    help: 'The name of the widget.'
  },
  {
    names: ['target', 'tr'],
    helpArg: '[target]',
    type: 'string',
    default: 'widgets/objectedge',
    help: 'The widget target path(e.g widgets/objectedge).'
  }
];

module.exports = Testing;
