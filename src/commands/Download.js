var util = require('util');
var Cmdln = require('cmdln').Cmdln;
var winston = require('winston');

const promisedCommand = require('./utils/promisedCommand');
var Theme = require('../core/theme');
var Widget = require('../core/widget');
var Search = require('../core/search');
var Email = require('../core/email');
var Stack = require('../core/stack');
var Files = require('../core/files');
var ResponseFilter = require('../core/response-filter');
var ServerSideExtension = require('../core/server-side-extension');
var AppLevel = require('../core/app-level');
var Element = require('../core/element');
var TextSnippet = require('../core/text-snippet');
var Type = require('../core/type');

var helpText = 'Download a %s from OCC.\n\n' +
'Usage:\n' +
'     {{name}} {{cmd}} [options] \n\n' +
'{{options}}';

function Download() {
  Cmdln.call(this, {
    name: 'occ-tools download',
    desc: 'Make a download specified by its type.'
  });
}

util.inherits(Download, Cmdln);

Download.prototype.do_widget = function(subcmd, opts, args, callback) {

  var widget = new Widget();

  widget.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  widget.on('error', function(error) {
    return callback(error);
  });

  widget.download(args[0], { dest: opts.dest });
};

Download.prototype.do_widget.help = (
  'Downloads widgets from OCC.\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <widgetName> [options] \n\n' +
  '{{options}}'
);

Download.prototype.do_widget.options = [{
  names: ['dest', 'd'],
  helpArg: '[dest]',
  type: 'string',
  help: '(Optional) The destination directory that widget will downloaded (oracle|objectedge).'
}];

Download.prototype.do_theme = function(subcmd, opts, args, callback) {

  var theme = new Theme('admin');

  theme.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  theme.on('error', function(error) {
    return callback(error);
  });

  theme.download(opts.name, callback);
};

Download.prototype.do_theme.help = util.format(helpText, 'theme');

Download.prototype.do_theme.options = [{
  names: ['name', 'n'],
  helpArg: '[name]',
  type: 'string',
  help: '(Optional) The theme ID to be downloaded. If not specified, download all items'
}];

Download.prototype.do_css = function(subcmd, opts, args, callback) {

  var theme = new Theme('admin');

  theme.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  theme.on('error', function(error) {
    return callback(error);
  });

  theme.downloadParsedCSS(args[0], opts.site, callback);
};

Download.prototype.do_css.help = 'Download the theme\'s parsed CSS from OCC.\n\n' +
'Usage:\n' +
'     {{name}} {{cmd}} <destination-dir>';

Download.prototype.do_css.options = [{
  names: ['site', 's'],
  helpArg: '[site]',
  type: 'string',
  default: 'siteUS',
  help: '(Optional) The default site.'
}];

Download.prototype.do_search = function(subcmd, opts, args, callback) {

  var search = new Search('search');

  search.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  search.on('error', function(error) {
    return callback(error);
  });

  search.download(args[0], callback);
};

Download.prototype.do_search.help = 'Download a search app from OCC.\n\n' +
'Usage:\n' +
'     {{name}} {{cmd}} <app>';

Download.prototype.do_sse_logs = function(subcmd, opts, args, callback) {
  var allowedLevels = ['debug', 'info', 'warning', 'error'];
  var options = {
    'level': opts.level,
    'date': opts.date,
    'destinationFolder': opts.destinationFolder
  };

  if (!allowedLevels.includes(options.level)){
    return callback('The supplied logging level must be one of the following values: debug, info, warning, error.');
  }

  var sse = new ServerSideExtension('adminX');

  sse.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  sse.on('error', function(error) {
    return callback(error);
  });

  sse.downloadLogs(options, callback);
};

Download.prototype.do_sse_logs.help = (
  'Download the logs from the extension server.\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} [options] \n\n' +
  '{{options}}'
);

Download.prototype.do_sse_logs.options = [
  {
    names: ['level', 'l'],
    helpArg: '[level]',
    type: 'string',
    default: 'debug',
    help: '(Optional) The logging level (debug, info, warning, error).'
  },
  {
    names: ['date', 'd'],
    helpArg: '[date]',
    type: 'string',
    help: '(Optional) Retrieve the logs from a specific date (format: yyyyMMdd).'
  },
  {
    names: ['destinationFolder', 'f'],
    helpArg: '[folder]',
    type: 'string',
    help: '(Optional) Place the downloaded logs on a specific folder. It defaults to the SSE root folder on the boilerplate.'
  }
];

Download.prototype.do_email = function(subcmd, opts, args, callback) {
  var emailId = args[0];
  var options = {
    'siteId': opts.site || 'siteUS'
  };

  var email = new Email('admin');

  email.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  email.on('error', function(error) {
    return callback(error);
  });

  email.download(emailId, options, callback);
};

Download.prototype.do_email.help = (
  'Download the email template from OCC.\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <email-id> [options] \n\n' +
  '{{options}}'
);

Download.prototype.do_email.options = [{
  names: ['site', 's'],
  helpArg: '[site]',
  type: 'string',
  default: 'siteUS',
  help: '(Optional) The site ID.'
}];

Download.prototype.do_stack = function(subcmd, opts, args, callback) {
  var stackName = args[0];

  if (!stackName) {
    return callback('Stack name not specified.');
  }

  var stack = new Stack('admin');

  stack.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  stack.on('error', function(error) {
    return callback(error);
  });

  stack.download(stackName, opts, callback);
};

Download.prototype.do_stack.help = (
  'Download the stack from OCC.\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <stack-name>'
);

Download.prototype.do_files = function(subcmd, opts, args, callback) {
  var allowedFolders = ['thirdparty', 'crashreports', 'general', 'collections', 'products'];
  var fileName = args[0];

  if (!fileName) {
    return callback('File name not specified.');
  }

  if (!allowedFolders.includes(opts.folder) && !opts.folder.startsWith('thirdparty/')) {
    return callback(util.format(
      'The supplied folder must be one of the following values: [%s]',
      allowedFolders.join(', ')
    ));
  }

  var files = new Files('adminUI');

  files.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  files.on('error', function(error) {
    return callback(error);
  });

  files.download(fileName, opts);
};

Download.prototype.do_files.help = (
  'Download files from OCC\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} [options] \n\n' +
  '{{options}}'
);

Download.prototype.do_files.options = [
  {
    names: ['folder', 'f'],
    helpArg: '[folder]',
    type: 'string',
    default: 'general',
    help: '(Optional) Folder: thirdparty, crashreports, general (default), collections, products.'
  }
];

Download.prototype.do_responseFilter = function(subcmd, opts, args, callback) {

  var responseFilter = new ResponseFilter('admin');

  responseFilter.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  responseFilter.on('error', function(error) {
    return callback(error);
  });

  responseFilter.download(opts);
};

Download.prototype.do_responseFilter.help = (
  'Download response filters from OCC\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} [options] \n\n' +
  '{{options}}'
);

Download.prototype.do_responseFilter.options = [
  {
    names: ['merge', 'm'],
    helpArg: '[merge]',
    type: 'bool',
    default: false,
    help: '(Optional) If needs to merge with the local one (default is overwrite).'
  }
];

Download.prototype.do_sse_variables = function(subcmd, opts, args, callback) {
  var sse = new ServerSideExtension('admin');

  sse.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  sse.on('error', function(error) {
    return callback(error);
  });

  sse.downloadVariables(opts);
};

Download.prototype.do_sse_variables.help = (
  'Download server-side extension variables from OCC\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} [options] \n\n' +
  '{{options}}'
);

Download.prototype.do_sse_variables.options = [
  {
    names: ['merge', 'm'],
    helpArg: '[merge]',
    type: 'bool',
    default: false,
    help: '(Optional) If needs to merge with the local one (default is overwrite).'
  },
  {
    names: ['file', 'f'],
    helpArg: '[file]',
    type: 'string',
    help: '(Optional) File path where the variables are stored.'
  }
];

Download.prototype.do_sse = function(subcmd, opts, args, callback) {
  var sseName = args[0];

  if (!sseName) {
    return callback('Server-side extension name not specified.');
  }

  var sse = new ServerSideExtension('admin');

  sse.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  sse.on('error', function(error) {
    return callback(error);
  });

  sse.download(sseName, opts, callback);
};

Download.prototype.do_sse.help = (
  'Download a server-side extension from OCC.\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <sse-name> '
);

Download.prototype.do_appLevel = function (subcmd, opts, args, callback) {
  var appLevelName = args[0];

  var appLevel = new AppLevel('admin');

  appLevel.on('complete', function (message) {
    winston.info(message);
    return callback();
  });

  appLevel.on('error', function (error) {
    return callback(error);
  });

  appLevel.download(appLevelName, callback);
};

Download.prototype.do_appLevel.help =
  'Download app-level from OCC.\n\n' +
  '     {{name}} {{cmd}} <app-level-name> [options] \n\n' +
  '{{options}}';


Download.prototype.do_element = function (subcmd, opts, args, callback) {
  var elementName = args[0];

  var element = new Element('admin');

  element.on('complete', function (message) {
    winston.info(message);
    return callback();
  });

  element.on('error', function (error) {
    return callback(error);
  });

  element.download(elementName, callback);
};

Download.prototype.do_element.help =
  'Download global element from OCC.\n\n' +
  '     {{name}} {{cmd}} <element-name> [options] \n\n' +
  '{{options}}';

Download.prototype.do_text_snippet = function (subcmd, opts, args, callback) {
  var locales = args[0];

  var textSnippet = new TextSnippet('admin');

  textSnippet.on('complete', function (message) {
    winston.info(message);
    return callback();
  });

  textSnippet.on('error', function (error) {
    return callback(error);
  });

  textSnippet.download(locales, callback);
};

Download.prototype.do_text_snippet.help =
  'Download text snippets from OCC.\n\n' +
  '     {{name}} {{cmd}} <locales> [options] \n\n' +
  '{{options}}';


Download.prototype.do_type = promisedCommand(async function (subcmd, opts, args) {
  const [mainType, subType]  = args;
  const type = new Type('admin');

  await type.download(mainType, subType);
});

Download.prototype.do_type.help =
  'Download types from OCC.\n\n' +
  '     {{name}} {{cmd}} <type> <subtype> \n\n' +
  '{{options}}';


module.exports = Download;
