var fs = require('fs-extra');
var util = require('util');
var Cmdln = require('cmdln').Cmdln;
var winston = require('winston');
var config = require('../core/config');
var InstanceCmd = require('../core/instance');
var login = require('../core/auth/loginApis');

function Instance() {
  Cmdln.call(this, {
    name: 'occ-tools instance',
    desc: 'OCC Instance tasks such as layout change, environment clone etc...'
  });
}

util.inherits(Instance, Cmdln);

Instance.prototype.do_grab_layouts = function(subcmd, opts, args, callback) {
  login(function(error) {
    if (error) {
      return callback(error);
    }

    var instance = new InstanceCmd('admin');

    instance.on('complete', function(msg) {
      winston.info(msg);
      return callback();
    });

    instance.on('error', function(err) {
      return callback(err);
    });

    instance.grabLayouts();
  });
};

Instance.prototype.do_grab_layouts.help = (
  'Grab all layouts.\n\n'
);

Instance.prototype.do_grab_widgets = function(subcmd, opts, args, callback) {
  login(function(error) {
    if (error) {
      return callback(error);
    }

    var instance = new InstanceCmd('admin');

    instance.on('complete', function(msg) {
      winston.info(msg);
      return callback();
    });

    instance.on('error', function(err) {
      return callback(err);
    });

    instance.grabWidgets();
  });
};

Instance.prototype.do_grab_widgets.help = (
  'Grab all widgets.\n\n'
);

module.exports = Instance;
