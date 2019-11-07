var util = require('util');
var winston = require('winston');
var Cmdln = require('cmdln').Cmdln;

var Index = require('../core/index');
var Email = require('../core/email');
var Publish = require('../core/publish');

function Trigger() {
  Cmdln.call(this, {
    name: 'trigger',
    desc: 'Triggers a command.'
  });
}

util.inherits(Trigger, Cmdln);

Trigger.prototype.do_index = function(subcmd, opts, args, callback) {

  var index = new Index('admin');

  index.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  index.on('error', function(error) {
    return callback(error);
  });

  index.trigger(opts.full_export ? 'baseline-full-export' : opts.baseline ? 'baseline': 'partial');
};

Trigger.prototype.do_index.help = (
  'Trigger a new search index on OCC\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} [options] \n\n' +
  '{{options}}'
);

Trigger.prototype.do_index.options = [
  {
    names: ['baseline', 'b'],
    helpArg: '<baseline>',
    type: 'bool',
    default: false,
    help: '(Optional) This flag will enable the baseline search index, otherwise it will run a partial index.'
  },
  {
    names: ['full-export', 'f'],
    helpArg: '<full-export>',
    type: 'bool',
    default: false,
    help: '(Optional) This flag will enable the baseline full export search index.'
  }
];

Trigger.prototype.do_email = function(subcmd, opts, args, callback) {
  var email = new Email('admin');
  var emailId = args[0];

  var settings = {
    mailTo: opts.mailTo,
    siteId: opts.siteId,
    locale: opts.locale || 'en-US',
    data: opts.data
  };

  if (!emailId) {
    return callback('Email ID not specified.');
  }

  if (!settings.mailTo) {
    return callback('Option mailTo not specified.');
  }

  if (!settings.data) {
    return callback('Option data not specified.');
  }

  email.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  email.on('error', function(error) {
    return callback(error);
  });

  email.trigger(emailId, settings);
};

Trigger.prototype.do_email.help = (
  'Trigger an email on OCC\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <email-id> [options] \n\n' +
  '{{options}}'
);

Trigger.prototype.do_email.options = [
  {
    names: ['mailTo', 'm'],
    helpArg: '<mailTo>',
    type: 'string',
    default: false,
    help: '(Required) Indicates to which mail box the email will be sent.'
  },
  {
    names: ['siteId', 's'],
    helpArg: '<siteId>',
    type: 'string',
    default: false,
    help: '(Optional) Indicates from which site the email will be sent.'
  },
  {
    names: ['data', 'd'],
    helpArg: '<data>',
    type: 'string',
    default: false,
    help: '(Required) The file that contains the JSON data.'
  },
  {
    names: ['locale', 'l'],
    helpArg: '<locale>',
    type: 'string',
    default: false,
    help: '(Optional) Indicates the emaile locale.'
  }
];

Trigger.prototype.do_publish = function(subcmd, opts, args, callback) {

  var publish = new Publish('admin');

  publish.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  publish.on('error', function(error) {
    return callback(error);
  });

  publish.trigger(opts);
};

Trigger.prototype.do_publish.help = (
  'Trigger a new publish on OCC\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}}'
);

module.exports = Trigger;
