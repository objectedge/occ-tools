var util = require('util');
var Cmdln = require('cmdln').Cmdln;
var winston = require('winston');

var _Browser = require('../core/browser');

function Browser() {
  Cmdln.call(this, {
    name: 'occ-tools browser',
    desc: 'Browser for development.'
  });
}

util.inherits(Browser, Cmdln);

//this is the "browser launch option for further self reference"
Browser.prototype.do_launch = function(subcmd, opts, args, callback) {
  var launcher = new _Browser({
    flags: opts.flags ? opts.flags.split(',') : false,
    useProxy: opts.noProxy ? false : true,
    browser: opts.browser,
    url: opts.url || false
  });

  launcher.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  launcher.on('error', function(error) {
    winston.error(error);
    return callback('[browser:error]', error);
  });
  launcher.launch();
};


Browser.prototype.do_launch.help = (
  'Launch a new browser for development\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} [options] \n\n' +
  '{{options}}'
);

Browser.prototype.do_launch.options = [
  {
    names: ['flags', 'f'],
    helpArg: '[flags]',
    default: '',
    type: 'string',
    help: '(Optional) Browser flags'
  },
  {
    names: ['noProxy', 'np'],
    helpArg: '[noProxy]',
    type: 'bool',
    help: '(Optional) Start a new browser instance without proxy'
  },
  {
    names: ['browser', 'b'],
    helpArg: '[browser]',
    type: 'string',
    help: '(Optional) The Browser Name'
  },
  {
    names: ['url', 'u'],
    helpArg: '[url]',
    type: 'string',
    help: '(Optional) The URL to start'
  }
];

Browser.prototype.do_config = function(subcmd, opts, args, callback) {
  var launcher = new _Browser({
    defaultBrowser: opts.default || false
  });

  launcher.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  launcher.on('error', function(error) {
    winston.error(error);
    return callback('[browser:error]', error);
  });

  launcher.config();
};

Browser.prototype.do_config.options = [
  {
    names: ['default', 'd'],
    helpArg: '[default]',
    type: 'string',
    help: '(Optional) The Default Browser'
  }
];

Browser.prototype.do_config.help = (
  'Show configs and the config path of the browsers or if passed the -d option, will update the default browser option.\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} [options] \n\n' +
  '{{options}}'
);

module.exports = Browser;
