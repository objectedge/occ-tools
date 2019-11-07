var util = require('util');
var winston = require('winston');
var Cmdln = require('cmdln').Cmdln;

var Email = require('../core/email');
var Stack = require('../core/stack');
var AppLevel = require('../core/app-level');
var Files = require('../core/files');
var ServerSideExtension = require('../core/server-side-extension');

function List() {
  Cmdln.call(this, {
    name: 'list',
    desc: 'List something.'
  });
}

util.inherits(List, Cmdln);

List.prototype.do_sse = function(subcmd, opts, args, callback) {

  var sse = new ServerSideExtension('admin');

  sse.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  sse.on('error', function(error) {
    return callback(error);
  });

  sse.list();
};

List.prototype.do_sse.help = (
  'List all server-side extensions OCC\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}}'
);

List.prototype.do_sse_variables = function(subcmd, opts, args, cb) {
  var sse = new ServerSideExtension('admin');

  sse.on('complete', function(msg) {
    winston.info(msg);
    return cb();
  });

  sse.on('error', function(err) {
    winston.error(err);
    return cb();
  });

  sse.listVariables();
};

List.prototype.do_sse_variables.help = (
  'List all server-side extension variables\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}}'
);

List.prototype.do_email = function(subcmd, opts, args, callback) {

  var email = new Email('admin');

  email.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  email.on('error', function(error) {
    return callback(error);
  });

  email.list(opts);
};

List.prototype.do_email.help = (
  'List all email templates on OCC\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} [options] \n\n' +
  '{{options}}'
);

List.prototype.do_email.options = [{
  names: ['enabled', 'e'],
  helpArg: '[enabled]',
  type: 'bool',
  default: false,
  help: '(Optional) If should list only enabled templates.'
},
{
  names: ['siteId', 's'],
  helpArg: '[siteId]',
  type: 'string',
  default: false,
  help: '(Optional) Indicates from which site the email will be sent.'
}];

List.prototype.do_stack = function(subcmd, opts, args, callback) {

  var stack = new Stack('admin');

  stack.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  stack.on('error', function(error) {
    return callback(error);
  });

  stack.list(opts);
};

List.prototype.do_stack.help = (
  'List all stacks on OCC\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} '
);

List.prototype.do_appLevel = function(subcmd, opts, args, callback) {

  var appLevel = new AppLevel('admin');

  appLevel.on('complete', function(messsage) {
    winston.info(messsage);
    return callback();
  });

  appLevel.on('error', function(error) {
    return callback(error);
  });

  appLevel.list(opts);
};

List.prototype.do_appLevel.help = (
  'List all app-levels on OCC\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} '
);

List.prototype.do_files = function(subcmd, opts, args, callback) {
  var allowedTypes = ['all', 'file', 'folder'];
  var allowedFolders = ['thirdparty', 'crashreports', 'general', 'collections', 'products']

  if (!allowedTypes.includes(opts.type)){
    return callback(util.format(
      'The supplied type must be one of the following values: [%s]',
      allowedTypes.join(', ')
    ));
  }

  if (!allowedFolders.includes(opts.folder) && !opts.folder.startsWith('thirdparty/')) {
    return callback(util.format(
      'The supplied folder must be one of the following values: [%s]',
      allowedFolders.join(', ')
    ));
  }

  var files = new Files('admin');

  files.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  files.on('error', function(error) {
    return callback(error);
  });

  files.list(opts);
};

List.prototype.do_files.help = (
  'List files on OCC\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} [options] \n\n' +
  '{{options}}'
);

List.prototype.do_files.options = [
  {
    names: ['folder', 'f'],
    helpArg: '[folder]',
    type: 'string',
    default: 'general',
    help: '(Optional) Folder to list: thirdparty, crashreports, general (default), collections, products.'
  },
  {
    names: ['sort', 's'],
    helpArg: '[sort]',
    type: 'string',
    default: 'name:asc',
    help: '(Optional) A sort directive in the form: field:direction where direction is asc or desc.'
  },
  {
    names: ['limit', 'l'],
    helpArg: '[limit]',
    type: 'positiveInteger',
    default: 100,
    help: '(Optional) Query limit (default = 100).'
  },
  {
    names: ['offset', 'o'],
    helpArg: '[offset]',
    type: 'positiveInteger',
    default: 0,
    help: '(Optional) Query offset (default = 0).'
  },
  {
    names: ['type', 't'],
    helpArg: '[type]',
    type: 'string',
    default: 'all',
    help: '(Optional) Asset type: all (default), file, or folder.'
  },
  {
    names: ['query', 'q'],
    helpArg: '[query]',
    type: 'string',
    default: null,
    help: '(Optional) Partial query on files names.'
  }
];

module.exports = List;
