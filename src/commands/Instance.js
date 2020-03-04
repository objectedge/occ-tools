var fs = require('fs');
var util = require('util');
var Cmdln = require('cmdln').Cmdln;
var winston = require('winston');
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

Instance.prototype.do_grab_libs = function(subcmd, opts, args, callback) {
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

    instance.grabLibs();
  });
};


Instance.prototype.do_grab_libs.help = (
  'Grab all libraries from OCC.\n\n'
);

Instance.prototype.do_grab_api_schema = function(subcmd, opts, args, callback) {
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

    instance.grabApiSchema();
  });
};


Instance.prototype.do_grab_api_schema.help = (
  'Grab API Schema from OCC.\n\n'
);

Instance.prototype.do_grab_pages_response = function(subcmd, opts, args, callback) {
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

    instance.grabPagesResponse();
  });
};


Instance.prototype.do_grab_pages_response.help = (
  'Grab Pages Response from OCC.\n\n'
);

Instance.prototype.do_local_server = function(subcmd, opts, args, callback) {
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

    instance.runLocalServer();
  });
};


Instance.prototype.do_local_server.help = (
  'Run Local Server using the instance local assets and apis.\n\n'
);

module.exports = Instance;
