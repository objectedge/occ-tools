var util = require('util');
var Cmdln = require('cmdln').Cmdln;
var winston = require('winston');

var Extension = require('../core/extension');

function Upgrade() {
  Cmdln.call(this, {
    name: 'occ-tools upgrade',
    desc: 'Make an upgrade specified by its type.'
  });
}

util.inherits(Upgrade, Cmdln);

Upgrade.prototype.do_widget = function(subcmd, opts, args, callback) {

  var extension = new Extension();

  extension.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  extension.on('error', function(error) {
    return callback(error);
  });

  extension.upgrade(args[0], {
    'datetime': opts.withDatetime,
    'type': 'widget'
  });
};

Upgrade.prototype.do_widget.help = (
  'Upgrade a widget on OCC.\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <widgetName> [options] \n\n' +
  '{{options}}'
);

Upgrade.prototype.do_widget.options = [
  {
    names: ['withDatetime', 'datetime'],
    helpArg: '<withDatetime>',
    type: 'bool',
    default: false,
    help: '(Optional) If set to true, the will include the datetime, not only the date (default: false).'
  }
];

Upgrade.prototype.do_config = function(subcmd, opts, args, callback) {

  var extension = new Extension();

  extension.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  extension.on('error', function(error) {
    return callback(error);
  });

  extension.upgrade(args[0], {
    'datetime': opts.withDatetime,
    'type': 'config'
  });
};

Upgrade.prototype.do_config.help = (
  'Upgrade a site settings on OCC.\n\n' +
  'This command tries to backup the current configuration and set it back when the upgrade is complete\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <config> [options] \n\n' +
  '{{options}}'
);

Upgrade.prototype.do_config.options = [
  {
    names: ['withDatetime', 'datetime'],
    helpArg: '<withDatetime>',
    type: 'bool',
    default: false,
    help: '(Optional) If set to true, the will include the datetime, not only the date (default: false).'
  }
];

Upgrade.prototype.do_gateway = function(subcmd, opts, args, callback) {

  var extension = new Extension();

  extension.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  extension.on('error', function(error) {
    return callback(error);
  });

  extension.upgrade(args[0], {
    'datetime': opts.withDatetime,
    'type': 'gateway'
  });
};

Upgrade.prototype.do_gateway.help = (
  'Upgrade a payment gateway extension on OCC.\n\n' +
  'This command tries to backup the current configuration and set it back when the upgrade is complete\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <config> [options] \n\n' +
  '{{options}}'
);

Upgrade.prototype.do_gateway.options = [
  {
    names: ['withDatetime', 'datetime'],
    helpArg: '<withDatetime>',
    type: 'bool',
    default: false,
    help: '(Optional) If set to true, the will include the datetime, not only the date (default: false).'
  }
];

Upgrade.prototype.do_appLevel = function(subcmd, opts, args, callback) {

  var extension = new Extension();

  extension.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  extension.on('error', function(error) {
    return callback(error);
  });

  extension.upgrade(args[0], {
    'datetime': opts.withDatetime,
    'type': 'app-level'
  });
};

Upgrade.prototype.do_appLevel.help = (
  'Upgrade an app level extension on OCC.\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <app-level> [options] \n\n' +
  '{{options}}'
);

Upgrade.prototype.do_appLevel.options = [
  {
    names: ['withDatetime', 'datetime'],
    helpArg: '<withDatetime>',
    type: 'bool',
    default: false,
    help: '(Optional) If set to true, the will include the datetime, not only the date (default: false).'
  }
];

module.exports = Upgrade;
