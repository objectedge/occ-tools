var util = require('util');
var winston = require('winston');
var Cmdln = require('cmdln').Cmdln;

var Email = require('../core/email');

function Compile() {
  Cmdln.call(this, {
    name: 'compile',
    desc: 'Compiles something.'
  });
}

util.inherits(Compile, Cmdln);

Compile.prototype.do_email = function(subcmd, opts, args, callback) {

  var email = new Email('admin');
  var emailId = args[0];

  var settings = {
    mailTo: opts.mailTo,
    mailFrom: opts.mailFrom,
    mailToHost: opts.mailToHost,
    mailToAuthUser: opts.mailToAuthUser,
    mailToAuthPassword: opts.mailToAuthPassword,
    mailCompilerServer: opts.mailCompilerServer,
    locale: opts.locale || 'en',
    data: opts.data
  };

  if (!emailId) {
    return callback('Email Id not specified.');
  }

  if (!settings.data) {
    return callback('Opion data not specified.');
  }

  if(settings.mailTo) {
    if(!settings.mailFrom) {
      return callback('mailFrom option not specified and this is required when using mailTo.');
    }

    if(!settings.mailToHost) {
      return callback('mailToHost option not specified and this is required when using mailTo.');
    }

    if(!settings.mailToAuthUser) {
      return callback('mailToAuthUser option not specified and this is required when using mailTo.');
    }

    if(!settings.mailToAuthPassword) {
      return callback('mailToAuthPassword option not specified and this is required when using mailTo.');
    }
  }

  email.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  email.on('error', function(error) {
    return callback(error);
  });

  email.compile(emailId, settings);
};

Compile.prototype.do_email.help = (
  'Compile an email template and optionally send it\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <email-id> [options] \n\n' +
  '{{options}}'
);

Compile.prototype.do_email.options = [
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
  },
  {
    names: ['mailTo', 'm'],
    helpArg: '<mailTo>',
    type: 'string',
    default: false,
    help: '(Optional) Indicates to which mail box the email will be sent.'
  },
  {
    names: ['mailToHost', 'mth'],
    helpArg: '<mailToHost>',
    type: 'string',
    default: false,
    help: '(Optional) Indicates the mail to host.'
  },
  {
    names: ['mailToAuthUser', 'mtu'],
    helpArg: '<mailToUser>',
    type: 'string',
    default: false,
    help: '(Optional) Indicates the mail to host username.'
  },
  {
    names: ['mailToAuthPassword', 'mtp'],
    helpArg: '<mailToPassword>',
    type: 'string',
    default: false,
    help: '(Optional) Indicates the mail to host password.'
  },
  {
    names: ['mailFrom', 'mf'],
    helpArg: '<mailFrom>',
    type: 'string',
    default: false,
    help: '(Optional) Indicates the mail from.'
  },
  {
    names: ['mailCompilerServer', 'mcs'],
    helpArg: '<mailCompilerServer>',
    type: 'string',
    default: false,
    help: '(Optional) Indicates the mail compiler server.'
  }
];

module.exports = Compile;
