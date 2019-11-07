var util = require('util');
var Cmdln = require('cmdln').Cmdln;
var winston = require('winston');
var fs = require('fs-extra');
var Extension = require('../core/extension');

function Restore() {
  Cmdln.call(this, {
    name: 'occ-tools restore',
    desc: 'Restore the data specified by its type.'
  });
}

util.inherits(Restore, Cmdln);

function validateInput(args, callback) {
  if (args.length < 2) {
    return callback('Invalid number of arguments supplied.');
  }

  var name = args[0];
  var file = args[1];

  if (!name) {
    return callback('Extension name not specified.');
  }

  if (!file) {
    return callback('Backup file not supplied.');
  }

  try{
    fs.lstatSync(file);
    callback();
  } catch(e) {
    return callback('Backup file does not exist.');
  }
}

Restore.prototype.do_widget = function (subcmd, opts, args, callback) {
  validateInput(args, function(error){
    if (error){
      callback(error);
    }
  });

  var extension = new Extension();

  extension.on('complete', function (message) {
    winston.info(message);
    return callback();
  });

  extension.on('error', function (error) {
    return callback(error);
  });

  extension.restore(args[0], args[1], { 'type': 'widget' });
};

Restore.prototype.do_widget.help = (
  'Restore a widget on OCC.\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <widgetName> <file>'
);

Restore.prototype.do_config = function (subcmd, opts, args, callback) {

  validateInput(args, function(error){
    if (error){
      callback(error);
    }
  });

  var extension = new Extension();

  extension.on('complete', function (message) {
    winston.info(message);
    return callback();
  });

  extension.on('error', function (error) {
    return callback(error);
  });

  extension.restore(args[0], args[1], { 'type': 'config' });
};

Restore.prototype.do_config.help = (
  'Restore a site settings on OCC.\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <config> <file>'
);

Restore.prototype.do_gateway = function (subcmd, opts, args, callback) {

  validateInput(args, function(error){
    if (error){
      callback(error);
    }
  });

  var extension = new Extension();

  extension.on('complete', function (message) {
    winston.info(message);
    return callback();
  });

  extension.on('error', function (error) {
    return callback(error);
  });

  extension.restore(args[0], args[1], { 'type': 'gateway' });
};

Restore.prototype.do_gateway.help = (
  'Restore a payment gateway extension on OCC.\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <config> <file>'
);

Restore.prototype.do_appLevel = function (subcmd, opts, args, callback) {
  validateInput(args, function(error){
    if (error){
      callback(error);
    }
  });

  var extension = new Extension();

  extension.on('complete', function (message) {
    winston.info(message);
    return callback();
  });

  extension.on('error', function (error) {
    return callback(error);
  });

  extension.restore(args[0], args[1], { 'type': 'app-level' });
};

Restore.prototype.do_appLevel.help = (
  'Restore an app level extension on OCC.\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <app-level> <file>'
);

module.exports = Restore;
