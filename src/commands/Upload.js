var util = require('util');
var fs = require('fs-extra');
var glob = require('glob');
var path = require('path');

var Cmdln = require('cmdln').Cmdln;
var winston = require('winston');

const promisedCommand = require('./utils/promisedCommand');
var Theme = require('../core/theme');
var Widget = require('../core/widget');
var Search = require('../core/search');
var Email = require('../core/email');
var Stack = require('../core/stack');
var AppLevel = require('../core/app-level');
var Files = require('../core/files');
var ServerSideExtension = require('../core/server-side-extension');
var ResponseFilter = require('../core/response-filter');
var Type = require('../core/type');

var config = require('../core/config');

function Upload() {
  Cmdln.call(this, {
    name: 'occ-tools upload',
    desc: 'Make an upload specified by its type.'
  });
}

util.inherits(Upload, Cmdln);

Upload.prototype.do_widget = function(subcmd, opts, args, callback) {
  var settings = {
    files: opts.files && opts.files.split(',') || undefined,
    times: opts.times || 1,
    minify: opts.minify || false,
    locales: opts.locales
  };

  var widget = new Widget();

  widget.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  widget.on('error', function(error) {
    return callback(error);
  });

  widget.upload(args[0], settings);
};

Upload.prototype.do_widget.help = (
  'Uploads widgets to OCC.\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <widgetName> [options] \n\n' +
  '{{options}}'
);

Upload.prototype.do_widget.options = [
  {
    names: ['files', 'f'],
    helpArg: '[files]',
    type: 'string',
    help: '(Optional) The files to upload separated by comma. The path needs to be relative to the widget folder.'
  },
  {
    names: ['times', 't'],
    helpArg: '[times]',
    type: 'number',
    help: '(Optional) The number of times to repeat the upload.'
  },
  {
    names: ['minify', 'm'],
    type: 'bool',
    help: '(Optional) Minify the oracle\'s minified files and create a source map (default: false).'
  },
  {
    names: ['locales', 'l'],
    helpArg: '[locales]',
    type: 'string',
    help: '(Optional) The locales to upload separated by commas. The path needs to be relative to the widget resources folder. (e.g: en,fr,fr-CA).'
  }
];

Upload.prototype.do_theme = function(subcmd, opts, args, callback) {
  var theme = new Theme('adminUI');

  theme.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  theme.on('error', function(error) {
    return callback(error);
  });

  theme.upload(args[0], callback);
};

Upload.prototype.do_theme.help = (
  'Uploads themes to OCC.\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <themeID>'
);

Upload.prototype.do_search = function(subcmd, opts, args, callback) {

  var search = new Search('search');

  search.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  search.on('error', function(error) {
    return callback(error);
  });

  search.upload(args[0], callback);
};

Upload.prototype.do_search.help = (
  'Upload a search resource to OCC.\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <resource>'
);

Upload.prototype.do_sse = function(subcmd, opts, args, callback){
  var name = args[0];

  if (!name && !opts.names && !opts.all) {
    return callback('You must provide at least one of the following arguments: [SSE Name] or --names=[list of sses] or --all.');
  }

  var sse = new ServerSideExtension('adminUI');

  sse.on('complete', function(message){
    winston.info(message);
    return callback();
  });

  sse.on('error', function(error){
    return callback(error);
  });

  sse.upload(name, opts);
};

Upload.prototype.do_sse.help = (
  'Upload a server-side extension to OCC.\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <sse-name>'
);

Upload.prototype.do_sse.options = [
  {
    names: ['names', 'n'],
    helpArg: '[names]',
    type: 'string',
    help: '(Optional) The list of SSEs to be uploaded separated by comma'
  },
  {
    names: ['npm', 'i'],
    helpArg: '[npm]',
    type: 'bool',
    help: '(Optional) Should remove node modules and install with --only=prod'
  },
  {
    names: ['all', 'a'],
    type: 'bool',
    help: '(Optional) Deploy all SSEs'
  },
  {
    names: ['times', 't'],
    helpArg: '[times]',
    type: 'number',
    default: 20,
    help: '(Optional) The maximum number of times that we will check if the SSE Server is up. Default to 20.'
  },
  {
    names: ['delay', 'd'],
    helpArg: '[delay]',
    type: 'number',
    default: 15000,
    help: '(Optional) The delay between each SSE Server Push in Milliseconds. Default to 15000ms.'
  },
  {
    names: ['skip', 's'],
    helpArg: '[skip]',
    type: 'string',
    help: '(Optional) The list of SSEs to skipped separated by comma'
  },
];

Upload.prototype.do_email = function(subcmd, opts, args, callback) {
  var emailId = args[0];
  var options = {
    'siteId': opts.site || 'siteUS',
    'languageId': opts.language || 'en'
  };

  if (!emailId) {
    return callback('Email ID not specified.');
  }

  var email = new Email('admin');

  email.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  email.on('error', function(error) {
    return callback(error);
  });

  email.upload(emailId, options, callback);
};

Upload.prototype.do_email.help = (
  'Upload the email template to OCC.\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <email-id> [options] \n\n' +
  '{{options}}'
);

Upload.prototype.do_email.options = [{
  names: ['site', 's'],
  helpArg: '[site]',
  type: 'string',
  default: 'siteUS',
  help: '(Optional) The site ID.'
},
{
  names: ['language', 'l'],
  helpArg: '[language]',
  type: 'string',
  default: 'en',
  help: '(Optional) The site language.'
}];

Upload.prototype.do_stack = function(subcmd, opts, args, callback) {
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

  stack.upload(stackName, opts, callback);
};

Upload.prototype.do_stack.help = (
  'Upload the stack to OCC.\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <stack-name> [options] \n\n' +
  '{{options}}'
);

Upload.prototype.do_appLevel = function(subcmd, opts, args, callback) {
  var appLevelNames = args;
  var appLevelBasePath = path.join(config.dir.project_root, 'app-level');

  if (!appLevelNames.length) {
    appLevelNames = glob.sync(appLevelBasePath + '/*').map(url => url.split('/').pop());
  }

  var appLevel = new AppLevel('admin');

  appLevel.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  appLevel.on('error', function(error) {
    return callback(error);
  });


  appLevel.upload(appLevelNames, opts, callback);
};

Upload.prototype.do_appLevel.help = (
  'Upload an app-level to OCC.\n' +
  'App-level name is optional. If name is not specified it will upload oeCore and msidna-components\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <stack-name> [options] \n\n' +
  '{{options}}'
);

Upload.prototype.do_files = function(subcmd, opts, args, callback) {
  var filePath = args[0];
  var allowedFolders = ['thirdparty', 'crashreports', 'general', 'collections', 'products'];

  if (!allowedFolders.includes(opts.folder) && !opts.folder.startsWith('thirdparty/')) {
    return callback(util.format(
      'The supplied folder must be one of the following values: [%s]',
      allowedFolders.join(', ')
    ));
  }

  if (!filePath) {
    return callback('File not specified.');
  }

  var files = new Files('adminUI');

  files.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  files.on('error', function(error) {
    return callback(error);
  });

  var self = this;
  files.uploadCommand(filePath, opts, function(cb) {
    self.do_appLevel('appLevel', {}, [], cb);
  });
};

Upload.prototype.do_files.help = (
  'Upload files to OCC.\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <file-path> [options] \n\n' +
  '{{options}}'
);

Upload.prototype.do_files.options = [
  {
    names: ['folder', 'f'],
    helpArg: '[folder]',
    type: 'string',
    default: 'general',
    help: '(Optional) Folder to upload: thirdparty, crashreports, general (default), collections, products.'
  },
  {
    names: ['no-minify', 'nm'],
    helpArg: '[no-minify]',
    type: 'bool',
    help: '(Optional) Prevent js and json minification'
  }
];

Upload.prototype.do_responseFilter = function(subcmd, opts, args, callback) {
  var filterId = args[0];

  var responseFilter = new ResponseFilter('admin');

  responseFilter.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  responseFilter.on('error', function(error) {
    return callback(error);
  });

  responseFilter.upload(filterId, opts, callback);
};

Upload.prototype.do_responseFilter.help = (
  'Upload response filter to OCC.\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} [filter-id]'
);

Upload.prototype.do_sse_variables = function(subcmd, opts, args, callback) {
  var variableName = args[0];
  var file = opts.file;

  if (file){
    try {
      fs.lstatSync(file);
    } catch (e) {
      winston.debug(e);
      callback('Variables file does not exists.');
    }
  }

  var sse = new ServerSideExtension('admin');

  sse.on('complete', function(message) {
    winston.info(message);
    return callback();
  });

  sse.on('error', function(error) {
    return callback(error);
  });

  sse.uploadVariables(variableName, opts, callback);
};

Upload.prototype.do_sse_variables.help = (
  'Upload server-side extension variables to OCC.\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} [variable-name] \n\n' +
  '{{options}}'
);

Upload.prototype.do_sse_variables.options = [
  {
    names: ['file', 'f'],
    helpArg: '[file]',
    type: 'string',
    help: '(Optional) File path where the variables are stored.'
  }
];

Upload.prototype.do_type = promisedCommand(async function (command, options, args) {
  const [mainType, subType] = args;
  const type = new Type('admin');

  await type.upload(mainType, subType, options);
  winston.info('Upload process finished');
});

Upload.prototype.do_type.help =
  'Upload types to OCC.\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <type> <subtype> \n\n' +
  '{{options}}';

Upload.prototype.do_type.options = [
  {
    names: ['allowNonUnderscoreNames', 'u'],
    helpArg: '[allow-non-underscore-names]',
    type: 'bool',
    default: false,
    help: '(Optional) If true, allow the creation of custom property names that do not contain an underscore(\'_\') - default: false.'
  },
  {
    names: ['notUploadVariantValues', 'n'],
    helpArg: '[not-upload-variant-values]',
    type: 'bool',
    default: false,
    help: '(Optional) If true, send values to variants - default: false'
  }
];

module.exports = Upload;
