var util = require('util');
var Cmdln = require('cmdln').Cmdln;
var winston = require('winston');

var Widget = require('../core/widget');
var Theme = require('../core/theme');
var Extension = require('../core/extension');
var Element = require('../core/element');
var ServerSideExtension = require('../core/server-side-extension');
var SiteSettings = require('../core/site-settings');
var Gateway = require('../core/gateway');
var Deploy = require('../core/deploy');
var AppLevel = require('../core/app-level');
var occConfigs = require('../core/config');
var path = require('path');

function getStorefrontNormalizedPath (directory) {
  var storefrontDirName = occConfigs.dir.storefront_dir_name;
  var storefrontBasePath = directory.indexOf(storefrontDirName) !== -1 ? '../' : '.';

  return path.join(occConfigs.dir.project_root, storefrontBasePath, directory);
}

function Generator() {
  Cmdln.call(this, {
    name: 'occ-tools generate',
    desc: 'Run a specific generator.'
  });
}

util.inherits(Generator, Cmdln);

Generator.prototype.do_widget = function(subcmd, opts, args, callback) {
  var name = args[0];
  var target = opts.target;

  if (!name) {
    return callback('Widget name not specified.');
  }

  if (!target) {
    return callback('Widget destination directory not specified.');
  }

  var widget = new Widget();

  widget.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  widget.on('error', function(error) {
    return callback(error);
  });

  widget.generate(name, {
    target: target,
    fromOcc: opts.fromOcc,
    description: opts.desc,
    global: opts.global || false,
    es6: opts.es2015,
    base: opts.base || false
  }, callback);
};

Generator.prototype.do_widget.help = (
'Generate a new widget from a template.\n\n' +
'Usage:\n' +
'     {{name}} {{cmd}} <widget-name> --target <destination-target> --desc ["Widget Description"] --global [false] --es6 [false] --base ["OCC Components Widget Name"] \n\n' +
'{{options}}'
);

Generator.prototype.do_widget.options = [
  {
    names: ['desc', 'd'],
    helpArg: '[desc]',
    type: 'string',
    help: '(Optional) The name used to describe the widget. If ommited it will use the widget name.'
  },
  {
    names: ['fromOcc', 'c', 'occ'],
    helpArg: '[from-occ]',
    type: 'string',
    default: false,
    help: '(Optional) Use the defined OCC OOTB widget type, id or instance id as a template for the new widget.'
  },
  {
    names: ['target', 't'],
    helpArg: '<target>',
    type: 'string',
    help: '(Required) The widget destination folder (e.g. widgets/objectedge).'
  },
  {
    names: ['global', 'g'],
    helpArg: '<global>',
    type: 'bool',
    help: '(Optional) If the widget will be global or not (default: false).'
  },
  {
    names: ['es2015', 'es6'],
    helpArg: '<es2015>',
    type: 'bool',
    default: false,
    help: '(Optional) If the widget will be generated using es6 pattern (default: false).'
  },
  {
    names: ['base', 'b'],
    helpArg: '<base>',
    type: 'string',
    help: '(Optional) Specify which widget will be used as a base to the current widget (Only works with ES6).'
  }
];

Generator.prototype.do_theme = function(subcmd, opts, args, callback) {

  var theme = new Theme('adminUI', opts);

  theme.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  theme.on('error', function(error) {
    return callback(error);
  });

  theme.generate();
};

Generator.prototype.do_theme.options = [
  {
    names: ['httpAuth', 'hta'],
    helpArg: '<user:password>',
    type: 'string',
    help: '(Optional) Set HTTP AUTH if necessary'
  },
  {
    names: ['site', 's'],
    helpArg: '[site]',
    type: 'string',
    default: 'siteUS',
    help: '(Optional) The default site.'
  }
];

Generator.prototype.do_theme.help = (
'Generate theme styles and build the styleguide.\n\n' +
'Usage:\n' +
'     {{name}} {{cmd}} --httpAuth [user:password] \n\n'
);

Generator.prototype.do_extension = function(subcmd, opts, args, callback) {

  var extension = new Extension();

  extension.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  extension.on('error', function(error) {
    return callback(error);
  });

  /**
   * Normalizes the --dir to consider storefront in order to
   * avoid replicating the logic around the generate methods
   */
  extension.generate({
    extensionId: args[0],
    dir: getStorefrontNormalizedPath(opts.dir),
    widgets: opts.widgets,
    name: opts.name || opts.widgets.split(',')[0],
    isAppLevel: opts.appLevel,
    isConfig: opts.config,
    isGateway: opts.gateway,
    datetime: opts.withDatetime,
    output: opts.output
  }, callback);
};

Generator.prototype.do_extension.help = (
'Generate the extension with ZIP format ready to be uploaded in OCC.\n\n' +
'Usage:\n' +
'     {{name}} {{cmd}} <extension-ID> --dir <widgets-dir> --widgets <widget1,widget2,widget3...> --name <extension-name> \n\n' +
'{{options}}'
);

Generator.prototype.do_extension.options = [
  {
    names: ['dir', 'd'],
    helpArg: '<dir>',
    type: 'string',
    help: '(Required) The widgets root directory.'
  },
  {
    names: ['widgets', 'w'],
    helpArg: '<widgets>',
    type: 'string',
    help: '(Required) The list of widgets will be bundled in the package.'
  },
  {
    names: ['name', 'n'],
    helpArg: '<name>',
    type: 'string',
    help: '(Optional) The extension name.'
  },
  {
    names: ['appLevel', 'app'],
    helpArg: '<appLevel>',
    type: 'bool',
    default: false,
    help: '(Optional) Set if this extension is an app level application.'
  },
  {
    names: ['config', 'c'],
    helpArg: '<config>',
    type: 'bool',
    default: false,
    help: '(Optional) Set if this extension is a site settings.'
  },
  {
    names: ['gateway', 'g'],
    helpArg: '<gateway>',
    type: 'bool',
    default: false,
    help: '(Optional) Set if this extension is a gateway.'
  },
  {
    names: ['withDatetime', 'datetime'],
    helpArg: '<withDatetime>',
    type: 'bool',
    default: false,
    help: '(Optional) If set to true, the will include the datetime, not only the date (default: false).'
  },
  {
    names: ['output', 'o'],
    helpArg: '<output>',
    type: 'string',
    help: '(Optional) Set a specific output folder where the zip will be sent to.'
  }
];

Generator.prototype.do_element = function(subcmd, opts, args, callback) {
  var name = args[0];
  var widget = opts.widget || false;

  if (!name) {
    return callback('Element name not specified.');
  }

  var element = new Element();

  element.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  element.on('error', function(error) {
    return callback(error);
  });

  element.generate(name, { widget: widget }, callback);
};

Generator.prototype.do_element.help = (
'Generate a new element.\n\n' +
'At generating the very first element, this cmd will also create a "layouts/widget.template" file.\n\n' +
'Usage:\n' +
'     {{name}} {{cmd}} <element-name> --widget <widget-target> --global'
);

Generator.prototype.do_element.options = [
  {
    names: ['widget', 'w'],
    helpArg: '<widget>',
    type: 'string',
    help: '(Optional) If the element will be Widget-specific or Global (extension).'
  }
];

Generator.prototype.do_sse = function(subcmd, opts, args, callback) {
  var name = args[0];

  if (!name) {
    return callback('Sever side extension name not specified.');
  }

  var sse = new ServerSideExtension('admin');

  sse.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  sse.on('error', function(error) {
    return callback(error);
  });

  sse.generate(name, opts, cb);
};

Generator.prototype.do_sse.help = (
  'Generate a new server side extension.\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <sse-name>\n\n' +
  '{{options}} '
);

Generator.prototype.do_sse.options = [
  {
    names: ['sdk', 's', 'include-sdk'],
    helpArg: '[include-sdk]',
    type: 'bool',
    default: false,
    help: '(Optional) If should include Commerce Cloud SDK.'
  }
];

Generator.prototype.do_config = function(subcmd, opts, args, callback) {
  var name = args[0];

  if (!name) {
    return callback('Site settings name not specified.');
  }

  var siteSettings = new SiteSettings();

  siteSettings.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  siteSettings.on('error', function(error) {
    return callback(error);
  });

  siteSettings.generate(name, {}, callback);
};
Generator.prototype.do_config.help = (
'Generate a new site settings.\n\n' +
'Usage:\n' +
'     {{name}} {{cmd}} <config-name>'
);

Generator.prototype.do_gateway = function(subcmd, opts, args, callback) {
  var name = args[0];
  var options = {
    'types': opts.types.split(',')
  };

  if (!name) {
    return callback('Payment Gateway name not specified.');
  }

  var gateway = new Gateway();

  gateway.on('complete', function(messsage) {
    winston.info(messsage);
    return callback();
  });

  gateway.on('error', function(error) {
    return callback(error);
  });

  gateway.generate(name, options, callback);
};

Generator.prototype.do_gateway.help = (
'Generate a new payment gateway settings.\n\n' +
'Usage:\n' +
'     {{name}} {{cmd}} <gateway-name>\n\n' +
'{{options}} \n\n'+
'Possible types: \n'+
' - card (default)\n'+
' - cash\n'+
' - generic\n'+
' - physicalGiftCard\n'+
' - invoice\n'+
' - loyaltyPoints'
);

Generator.prototype.do_gateway.options = [
  {
    names: ['types', 't'],
    helpArg: '<types>',
    type: 'string',
    default: 'card',
    help: '(Optional) A comma separated list of payment types allowed by the payment gateway.'
  }
];

Generator.prototype.do_appLevel = function(subcmd, opts, args, callback) {
  var name = args[0];

  var options = {
    'dir': opts.dir,
    'url': opts.url,
    'template': opts.template,
    'fromComponents': opts.from_components
  };

  if (!name && !options.url && !options.fromComponents) {
    return callback('App Level name not specified.');
  }

  var appLevel = new AppLevel();

  appLevel.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  appLevel.on('error', function(error) {
    return callback(error);
  });

  appLevel.generate(name, options, callback);
};

Generator.prototype.do_appLevel.help = (
'Generate a new application level javascript.\n\n' +
'Usage:\n' +
'     {{name}} {{cmd}} <app-level-name>\n\n' +
'{{options}} \n\n'
);

Generator.prototype.do_appLevel.options = [
  {
    names: ['dir', 'd'],
    helpArg: '<dir>',
    type: 'string',
    default: 'app-level/oeCore',
    help: '(Optional) The directory where the app-level will be created.'
  },
  {
    names: ['url', 'u'],
    helpArg: '<url>',
    type: 'string',
    help: '(Optional) The URL to download the app-level.'
  },
  {
    names: ['template', 't'],
    helpArg: '<template>',
    type: 'string',
    default: 'appLevel',
    help: '(Optional) The template to generate the app-level.'
  },
  {
    names: ['from-components', 'c'],
    helpArg: '<from-components>',
    type: 'string',
    help: '(Optional) If should download the app-level from components.'
  }
];


Generator.prototype.do_deploy = function(subcmd, options, args, callback) {
  var revision = args[0];

  if (!revision) {
    return callback('Commit ID not specified');
  }

  if (!options.file) {
    return callback('Output file not specified.');
  }

  var deploy = new Deploy('admin');

  deploy.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  deploy.on('error', function(error) {
    return callback(error);
  });

  deploy.generate(revision, options, callback);
};

Generator.prototype.do_deploy.help = (
'Generate a new deploy script.\n\n' +
'Usage:\n' +
'     {{name}} {{cmd}} <commit-id>\n\n' +
'{{options}} \n\n'
);

Generator.prototype.do_deploy.options = [
  {
    names: ['file', 'f'],
    helpArg: '<file>',
    type: 'string',
    help: '(Required) The file path where the deploy script will be stored.'
  },
  {
    names: ['head', 'h'],
    helpArg: '<head>',
    type: 'string',
    default: 'HEAD',
    help: '(Optional) Specify an optional HEAD for git.'
  }
];

module.exports = Generator;
