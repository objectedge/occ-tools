var util = require('util');
var path = require('path');
var Cmdln = require('cmdln').Cmdln;
var winston = require('winston');
var OccProxy = require('../core/proxy');
var config = require('../core/config');

function Proxy() {
  Cmdln.call(this, {
    name: 'occ-tools proxy',
    desc: 'Init a proxy server to local development.'
  });
}

util.inherits(Proxy, Cmdln);

// widget upload
Proxy.prototype.do_init = function(subcmd, opts, args, callback) {
  var currentEnvName = opts.currentEnv || config.environment.current;
  var currentEnv = config.environments.filter(function (item) {
    return item.name === currentEnvName;
  });

  if(!currentEnv.length) {
    return callback('The environment ' + currentEnvName + ' doesnt exist');
  }

  currentEnv = currentEnv[0];

  var proxyConfigs = {
    done: callback,
    environment: {
      current: currentEnv.name,
      baseUrl: currentEnv.url
    },
    proxyOptions: {
      port: opts.proxyport,
      appLevel: opts.proxyAppLevel
    },
    cache: {
      enabled: opts.cache,
      disableCache: opts.disableCache,
      wipeCacheOnExit: opts.keepCacheOnExit ? opts.keepCacheOnExit : true
    },
    reload: {
      js: opts.jsReload,
      less: opts.lessReload,
      template: opts.templateReload,
      theme: opts.themeReload
    },
    hidePreviewBar: opts.previewBar,
    fileWatchPolling: opts.polling,
    widgets: opts.widgets,
    noBrowser: opts.noBrowser,
    noLess: opts.noLess,
    auth: opts.auth,
    extraRoutes: opts.extraRoutes,
    theme: opts.theme,
    browser: {
      flags: opts.browserFlags || false,
      browserName: opts.browserName || false,
      browserUrl: opts.browserUrl || false
    }
  };

  new OccProxy(proxyConfigs);
};

Proxy.prototype.do_init.help = (
  'Start a proxy server.\n\n' +
  'Usage:\n' +
  '     {{name}} {{cmd}} <widgetName> [options] \n\n' +
  '{{options}}'
);

Proxy.prototype.do_init.options = [
  {
    names: ['currentEnv', 'ce'],
    type: 'string',
    help: 'Set a environment to work on with proxy'
  },
  {
    names: ['proxyport', 'pp'],
    type: 'number',
    default: config.proxy.port,
    help: 'Set a port to proxy server'
  },
  {
    names: ['proxyAppLevel', 'proxyApp'],
    type: 'bool',
    default: false,
    help: 'Activate proxy on app-level applications'
  },
  {
    names: ['cache', 'ch'],
    type: 'bool',
    default: true,
    help: 'Use the cache system'
  },
  {
    names: ['keepCacheOnExit', 'kce'],
    type: 'bool',
    help: 'Wipe cache on exit'
  },
  {
    names: ['jsReload', 'jsr'],
    type: 'bool',
    default: true,
    help: 'Use the auto JS reload when changing a js file'
  },
  {
    names: ['lessReload', 'lessr'],
    type: 'bool',
    default: true,
    help: 'Use the auto less reload when changing a less file'
  },
  {
    names: ['templateReload', 'tr'],
    type: 'bool',
    default: true,
    help: 'Use the auto template reload when changing a template file'
  },
  {
    names: ['themeReload', 'thr'],
    type: 'bool',
    default: true,
    help: 'Use the auto reload the theme when changing a theme file'
  },
  {
    names: ['previewBar', 'pb'],
    type: 'bool',
    default: true,
    help: 'Hide the preview bar'
  },
  {
    names: ['polling', 'poll'],
    type: 'bool',
    default: false,
    help: 'Activate the polling on file watch when the vagrant plugin doesnt work as expected'
  },
  {
    names: ['widgets', 'wd'],
    type: 'string',
    help: 'List of widgets to be activated by default'
  },
  {
    names: ['disableCache', 'dc'],
    type: 'string',
    default: "/ccstoreui/v1",
    help: 'List of paths to have the cache disable or a regex pattern'
  },
  {
    names: ['noBrowser', 'nb'],
    type: 'bool',
    help: 'Don\'t open a browser instance'
  },
  {
    names: ['noLess', 'nl'],
    type: 'bool',
    default: false,
    help: 'Don\'t render less files'
  },
  {
    names: ['auth', 'ah'],
    type: 'string',
    help: 'HTTP Authentication for the domains that requires this. Pattern username:password'
  },
  {
    names: ['extraRoutes', 'extr'],
    type: 'string',
    default: path.join(config.dir.project_root, 'proxy-routes'),
    help: 'File path to the index of an proxy-routes. This can be either a js file or a folder that has an index.js file. The proxy-routes should follow the proxy structure and will do replaces that matches to the regex.'
  },
  {
    names: ['theme', 'tm'],
    type: 'bool',
    default: false,
    help: 'Render internal theme instead of the remote one'
  },
  {
    names: ['browserFlags', 'bf'],
    type: 'string',
    help: 'The Browser flags'
  },
  {
    names: ['browserName', 'bn'],
    type: 'string',
    help: 'The Browser name to be opened by the proxy'
  },
  {
    names: ['browserUrl', 'bu'],
    type: 'string',
    help: 'The start url for proxy'
  }
];

module.exports = Proxy;
