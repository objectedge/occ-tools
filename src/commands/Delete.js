var util = require('util');
var winston = require('winston');
var Cmdln = require('cmdln').Cmdln;

var Files = require('../core/files');
var ServerSideExtension = require('../core/server-side-extension');
var ResponseFilter = require('../core/response-filter');

function Delete() {
  Cmdln.call(this, {
    name: 'delete',
    desc: 'Delete something.'
  });
}

util.inherits(Delete, Cmdln);

Delete.prototype.do_sse = function(subcmd, opts, args, callback) {
  var name = args[0];

  if (!name) {
    return callback('Sever-side extension name not specified.');
  }

  var sse = new ServerSideExtension('admin');

  sse.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  sse.on('error', function(error) {
    return callback(error);
  });

  sse.delete(name);
};

Delete.prototype.do_sse.help = (
  'Deletes a server-side extension OCC\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <sse-name>'
);

Delete.prototype.do_sse_variable = function(subcmd, opts, args, cb) {
  var name = args[0];

  if (!name) {
    winston.error('Sever-side extension variable not specified.');
    return cb();
  }

  var sse = new ServerSideExtension('admin');

  sse.on('complete', function(msg) {
    winston.info(msg);
    return cb();
  });

  sse.on('error', function(err) {
    winston.error(err);
    return cb();
  });

  sse.deleteVariable(name);
};

Delete.prototype.do_sse_variable.help = (
  'Deletes a server-side extension variable OCC\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <sse-name>'
);

Delete.prototype.do_files = function(subcmd, opts, args, callback) {
  var allowedFolders = ['thirdparty', 'crashreports', 'general', 'collections', 'products'];
  var fileName = args[0];

  if (!fileName) {
    return callback('File name not specified.');
  }

  if (!allowedFolders.includes(opts.folder) && !opts.folder.startsWith('thirdparty/')){
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

  files.delete(fileName, opts);
};

Delete.prototype.do_files.help = (
  'Delete files from OCC\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <glob-pattern> [options] \n\n' +
  '{{options}}'
);

Delete.prototype.do_files.options = [
  {
    names: ['folder', 'f'],
    helpArg: '[folder]',
    type: 'string',
    default: 'general',
    help: '(Optional) Folder: thirdparty, crashreports, general (default), collections, products.'
  }
];

Delete.prototype.do_responseFilter = function(subcmd, opts, args, callback) {
  var filterId = args[0];

  if (!filterId) {
    winston.error('Filter ID not specified.');
    return callback();
  }

  var responseFilter = new ResponseFilter('admin');

  responseFilter.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  responseFilter.on('error', function(error) {
    return callback(error);
  });

  responseFilter.delete(filterId);
};

Delete.prototype.do_responseFilter.help = (
  'Deletes a response filter from OCC\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <response-filter>'
);

module.exports = Delete;
