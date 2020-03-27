var fs = require('fs-extra');
var util = require('util');
var Cmdln = require('cmdln').Cmdln;
var winston = require('winston');
var config = require('../core/config');
var LocalServerInstance = require('../core/local-server');
var login = require('../core/auth/loginApis');
var domain = null;

function LocalServer() {
  Cmdln.call(this, {
    name: 'occ-tools local-server',
    desc: 'OCC Local Server - Run Local Server, grab libraries, apis responses'
  });
}

util.inherits(LocalServer, Cmdln);

LocalServer.prototype.do_grab_libs = function(subcmd, opts, args, callback) {
  login(async error => {
    if (error) {
      return callback(error);
    }

    try {
      const instance = new LocalServerInstance('admin');
      winston.info(await instance.grabLibs());
      callback();
    } catch(error) {
      callback(error);
    }
  });
}

LocalServer.prototype.do_grab_libs.help = (
  'Grab all libraries from OCC.\n\n'
);

LocalServer.prototype.do_grab_api_schema = function(subcmd, opts, args, callback) {
  login(async error => {
    if (error) {
      return callback(error);
    }

    try {
      const instance = new LocalServerInstance('admin');
      winston.info(await instance.grabApiSchema());
      callback();
    } catch(error) {
      callback(error);
    }
  });
}

LocalServer.prototype.do_grab_api_schema.help = (
  'Grab API Schema from OCC.\n\n'
);

LocalServer.prototype.do_grab_pages_response = function(subcmd, opts, args, callback) {
  login(async error => {
    if (error) {
      return callback(error);
    }

    try {
      const instance = new LocalServerInstance('admin');
      winston.info(await instance.grabPagesResponse(opts));
      callback();
    } catch(error) {
      callback(error);
    }
  });
}

LocalServer.prototype.do_grab_pages_response.options = [{
  names: ['type', 't'],
  helpArg: '[type]',
  type: 'string',
  default: 'all',
  help: '(Optional) Grab specific page content: pages, layouts, css, collections, products.'
}];

LocalServer.prototype.do_grab_pages_response.help = (
  'Grab Pages Response from OCC.\n\n'
);

LocalServer.prototype.do_grab_all = function(subcmd, opts, args, callback) {
  login(async error => {
    if (error) {
      return callback(error);
    }

    try {
      const instance = new LocalServerInstance('admin');
      winston.info(await instance.grabLibs());
      winston.info(await instance.grabApiSchema());
      winston.info(await instance.grabPagesResponse({ type: 'all' }));
      callback();
    } catch(error) {
      callback(error);
    }
  });
}

LocalServer.prototype.do_grab_all.help = (
  'Grab Libraries, Schema and pages responses from OCC.\n\n'
);

LocalServer.prototype.do_run = function (subcmd, opts, args, callback) {
  login(async error => {
    if (error) {
      return callback(error);
    }

    try {
      const instance = new LocalServerInstance('admin');
      winston.info(await instance.runLocalServer({ ...opts }));
      callback();
    } catch(error) {
      callback(error);
    }
  });
}

LocalServer.prototype.do_run.options = [
  {
    names: ['hosts', 's'],
    helpArg: '[hosts]',
    type: 'bool',
    default: false,
    help: '(Optional) It will set the hosts in your machine.'
  },
  {
    names: ['onlyServer', 'o'],
    helpArg: '[onlyServer]',
    type: 'bool',
    default: false,
    help: '(Optional) Only run the server. It will not run the transpiler and bundler'
  }
];

LocalServer.prototype.do_run.help = (
  'Run Local Server using the instance local assets and apis.\n\n'
);

module.exports = LocalServer;
