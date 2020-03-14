var fs = require('fs-extra');
var util = require('util');
var Cmdln = require('cmdln').Cmdln;
var winston = require('winston');
var config = require('../core/config');
var InstanceCmd = require('../core/instance');
var login = require('../core/auth/loginApis');
var domain = null;

function Instance() {
  Cmdln.call(this, {
    name: 'occ-tools instance',
    desc: 'OCC Instance tasks such as layout change, environment clone etc...',
    options: [
      {
        names: ['envkey', 'e'],
        helpArg: '[envkey]',
        type: 'string',
        required: true,
        help: 'The env key available at occ-tools.project.json'
      }
    ]
  });
}

util.inherits(Instance, Cmdln);

Instance.prototype.init = async function (opts, args, callback) {
  let environments;

  const errorMessage = () => {
    winston.error(`Please provide a valid environment key. You can find it at ${config.dir.occToolsProject}`);
  };

  try {
    environments = (await fs.readJSON(config.dir.occToolsProject)).environments;
  } catch(error) {
    return callbacl(error);
  }

  if(!opts.envkey) {
    errorMessage();
    return callback(true);
  }

  const foundEnvironment = environments.filter(env => env.name === opts.envkey);

  if(opts.envkey && !foundEnvironment.length) {
    errorMessage();
    return callback(true);
  }

  domain = foundEnvironment[0].url;

  // Cmdln class handles `opts.help`.
  Cmdln.prototype.init.apply(this, arguments);
};

Instance.prototype.do_grab_layouts = function(subcmd, opts, args, callback) {
  login(function(error) {
    if (error) {
      return callback(error);
    }

    var instance = new InstanceCmd('admin', { domain });

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

    var instance = new InstanceCmd('admin', { domain });

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

    var instance = new InstanceCmd('admin', { domain });

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

    var instance = new InstanceCmd('admin', { domain });

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

    var instance = new InstanceCmd('admin', { domain });

    instance.on('complete', function(msg) {
      winston.info(msg);
      return callback();
    });

    instance.on('error', function(err) {
      return callback(err);
    });

    instance.grabPagesResponse(opts);
  });
};

Instance.prototype.do_grab_pages_response.options = [{
  names: ['type', 't'],
  helpArg: '[type]',
  type: 'string',
  default: 'all',
  help: '(Optional) Grab specific page content: pages, layouts, css, collections, products.'
}];

Instance.prototype.do_grab_pages_response.help = (
  'Grab Pages Response from OCC.\n\n'
);

Instance.prototype.do_local_server = function(subcmd, opts, args, callback) {
  login(function(error) {
    if (error) {
      return callback(error);
    }

    var instance = new InstanceCmd('admin', { domain });

    instance.on('complete', function(msg) {
      winston.info(msg);
      return callback();
    });

    instance.on('error', function(err) {
      return callback(err);
    });

    instance.runLocalServer({ updateHosts: opts.updateHosts });
  });
};

Instance.prototype.do_local_server.options = [{
  names: ['updateHosts', 'u'],
  helpArg: '[updateHosts]',
  type: 'bool',
  default: true,
  help: '(Optional) It will by default update the hosts in your machine.'
}];

Instance.prototype.do_local_server.help = (
  'Run Local Server using the instance local assets and apis.\n\n'
);

module.exports = Instance;
