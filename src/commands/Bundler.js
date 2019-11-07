var util = require('util');
var Cmdln = require('cmdln').Cmdln;
var winston = require('winston');

var _Bundler = require('../core/bundler');

function Bundler() {
  Cmdln.call(this, {
    name: 'occ-tools bundler',
    desc: 'Bundle all js files.'
  });
}

util.inherits(Bundler, Cmdln);

Bundler.prototype.do_compile = function(subcmd, opts, args, callback) {
  //Widget name
  opts.widgetName = args[0];

  var bundler = new _Bundler(opts);

  if(opts.watch) {
    winston.info('[bundler:compile] Watching for file changes..');
  }

  bundler.on('complete', function(stats) {
    winston.debug('\n\n')
    winston.debug('[bundler:compile] Changes ----- %s ----- \n', new Date());
    winston.debug('[bundler:compile] %s', stats.toString({
      chunks: true, // Makes the build much quieter
      colors: true
    }));

    if(!opts.watch) {
      return callback();
    }
  });

  bundler.on('error', function(error) {
    winston.error('[bundler:error]', error);

    if(!opts.watch) {
      return callback();
    }
  });

  bundler.compile();
};

Bundler.prototype.do_compile.help = (
  'Compile all JS files from the widget\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <widgetName> [options] \n\n' +
  '{{options}}'
);

Bundler.prototype.do_compile.options = [
  {
    names: ['debug', 'db'],
    helpArg: '[debug]',
    default: true,
    type: 'bool',
    help: '(Optional) Sets a source map that brings the original source not the compiled one to debug..'
  },
  {
    names: ['sourceMapType', 'srcMapType'],
    helpArg: '[srcMapType]',
    type: 'string',
    help: '(Optional) Sets the source map type.'
  },
  {
    names: ['source', 'src'],
    helpArg: '[source]',
    type: 'string',
    default: '/js',
    help: '(Optional) The directory where the source of the JS files are placed at. It will look for the "js-src" that is defined as a dir in the current widget directory.'
  },
  {
    names: ['dest', 'd'],
    helpArg: '[dest]',
    type: 'string',
    default: '/js',
    help: '(Optional) The destination directory that the bundled JS will be put in. It will be placed at the "destination" dir based on its widget dir.'
  },
  {
    names: ['watch', 'w'],
    helpArg: '[watch]',
    default: false,
    type: 'bool',
    help: '(Optional) Option to keep on watching for files changes'
  },
  {
    names: ['polling', 'poll'],
    helpArg: '[polling]',
    type: 'bool',
    help: '(Optional) Watch files using polling instead of the native watcher'
  },
  {
    names: ['widgets', 'wd'],
    helpArg: '[widgets]',
    type: 'string',
    help: '(Optional) Widgets to be transpile. A list of widget can be used.'
  }
];

module.exports = Bundler;
