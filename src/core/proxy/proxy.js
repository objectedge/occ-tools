/**
 * Native dependencies
 */
var EventEmitter = require('events').EventEmitter;
var fs = require('fs-extra');
var path = require('path');
var util = require('util');

/**
 * Application dependencies
 */
var glob = require('glob');

/**
 * Proxy dependencies
 */
var ProxyCore = require('./proxyCore');
var helpers = require('./helpers');
var BrowserLauncher = require('../browser');
var Socket = require('./socket');
var chokidar = require('chokidar');
var config = require('../config');
var socketIOEvents = require('./socket/events');

/**
 * Configurations
 */

//Theme
var themeID = config.theme.id;
var themeName = config.theme.name;
var themePath = path.join(config.dir.project_root, 'themes', themeName + '_' + themeID);
var logIOEvents = true;

/**
 * All routes
 * @type {Object}
 */
var proxyRoutes = require('./routes');

/**
 *
 * Init the proxy
 *
 * @constructor
 */
function Proxy(options) {
  var proxyInstance = this;
  EventEmitter.call(proxyInstance);

  process.setMaxListeners(0);
  require('events').EventEmitter.prototype._maxListeners = 0;

  var envOptions = options.environment;
  var proxyOptions = options.proxyOptions;

  proxyInstance.currentMainPage = null;
  proxyInstance.options = options;
  proxyInstance.proxyServer = new ProxyCore(options);

  if(!options.cache.enabled) {
    proxyInstance.proxyServer.cache.disable();
  }

  proxyInstance.loadWidgets(function(widgets) {
    proxyInstance.proxyServer.setEnvOptions(envOptions);
    proxyInstance.proxyServer.setProxyOptions(proxyOptions);
    proxyInstance.proxyServer.startProxy();

    //Pause proxy on
    proxyInstance.proxyServer.setPauseRule(/occs-admin/);

    /**
     * Start a local https server which is used by the socket io
     */
    proxyInstance.initLocalHTTPSServer();

    proxyInstance.currentIP = config.currentIP;

    /**
     * Socket client
     * It's the browser JS
     */
    proxyInstance.setSocketIOClientEvents();

    /**
     * Start proxy routes
     */
    proxyInstance.setWidgetsOptions(widgets, proxyInstance.initProxyRouting);
  }, options);
}
util.inherits(Proxy, EventEmitter);

/**
 * Initialize the proxy
 */
Proxy.prototype.initProxyRouting = function () {
  var proxyInstance = this;
  var widgetsList = this.widgetsList;

  proxyInstance.initFilesWatching(widgetsList);

  //Starting routes
  helpers.forEach(Object.keys(proxyRoutes), function (routeKey) {
    var route = proxyRoutes[routeKey];
    route.call(proxyInstance);
  });

  proxyInstance.openBrowser();
};

Proxy.prototype.openBrowser = function () {
  var proxyInstance = this;

  var launcher = new BrowserLauncher({
    flags: proxyInstance.options.browser.flags,
    browser: proxyInstance.options.browser.browserName,
    url: proxyInstance.options.browser.browserUrl,
    useProxy: true,
    currentEnvName: proxyInstance.options.environment.current,
    withAuth: proxyInstance.options.auth,
    browserForProxy: true
  });

  if(typeof proxyInstance.options.noBrowser === 'undefined' || proxyInstance.options.noBrowser === false) {
    proxyInstance.proxyServer.log('\n\nstarting a browser for development..\n\n');

    launcher.on('complete', function(message) {
      proxyInstance.proxyServer.log(message);
    });
  
    launcher.on('error', function(err) {
      proxyInstance.proxyServer.log('[browser:error]', err);
    });
  
    launcher.launch(); 
  } else {
    var currentEnvironment = config.environments.find(function (environment) {
      return environment.name === proxyInstance.options.environment.current;
    });

    launcher.generatePACFile(currentEnvironment.url, function (error) {
      if(error) {
        proxyInstance.proxyServer.log('[browser:error]', err);
      } else {
        proxyInstance.proxyServer.log('Proxy Pac updated');
      }
    });
  }
};

Proxy.prototype.loadWidgets = function (done, options) {
  var proxyInstance = this;

  var basePath = path.join(config.dir.project_root, 'widgets/*/*');
  var widgetsList = [];
  var widgetsListOption = options.widgets ? options.widgets.split(',') : [];
  var activeAllWidgets = widgetsListOption[0] === '*';

  proxyInstance.proxyServer.log('Getting all widgets from ' +  path.join(config.dir.project_root, 'widgets/objectedge') + ' and ' + path.join(config.dir.project_root, 'widgets/oracle') + '...');

  glob(basePath)
    .on('match', function (widgetPath) {
      try {
        var widgetConfig = fs.readJsonSync(path.join(widgetPath, 'widget.json'));
        var widgetName = widgetConfig.widgetType || path.basename(widgetPath);
        var widgetMetaFilePath = path.join(widgetPath, 'widgetMeta.json');
        var widgetMeta = {};

        try {
          widgetMeta = fs.readJsonSync(widgetMetaFilePath);
        } catch (e) { }

        widgetsList.push({
          regionName: null,
          extensionName: widgetName,
          widgetName: widgetName,
          widgetPath: widgetPath,
          type: path.basename(path.resolve(widgetPath, '..')),
          active: activeAllWidgets || widgetsListOption.indexOf(widgetName) > -1,
          widgetMeta: widgetMeta
        });
      } catch(err) {
        proxyInstance.proxyServer.log('The Widget ' + widgetPath + " doesn't have any widget.json file");
      }
    })
    .on('end', function () {
      done.call(proxyInstance, widgetsList);
    });
};

Proxy.prototype.initFilesWatching = function (widgetsList) {
  var proxyInstance = this;
  var files = {
    js: [],
    less: [],
    template: [],
    theme: []
  };

  var processChanges = function (type, filePath) {
    var basePath = path.join(filePath, '../..');

    if(/\/element\//.test(filePath)) {
      proxyInstance.proxyServer.log('changes detected on file ' + filePath + ' but auto reload for elements is disable for now');
      return;
    }

    if(/\.occ-transpiled/.test(filePath)) {
      basePath = path.join(filePath, '..');
    }

    var widgetName = basePath.split('/');
    widgetName = widgetName[widgetName.length -1];

    var currentWidget = proxyInstance.getWidget(widgetName);

    var IOObject = {
      basePath: basePath,
      file: path.basename(filePath),
      fullFilePath: filePath,
      widgetName: widgetName,
      widget: currentWidget
    };

    if(type === 'template') {
      IOObject.templateSrc = fs.readFileSync(path.join(basePath, 'templates', 'display.template'), 'utf8');

      //Force other templates
      IOObject.templateSrc = IOObject.templateSrc.replace(/templateUrl:\s?''/g, 'templateUrl: ' + Math.random());
    }

    proxyInstance.watch[type].changed = true;

    if(!proxyInstance.options.reload[type]) {
      proxyInstance.proxyServer.log('changes detected on file ' + filePath + ' but auto reload is disabled for ' + type + ' files');
      return;
    } else {
      proxyInstance.proxyServer.log('changes detected on file ' + filePath);
    }

    proxyInstance.emitIOEvent(type + '-changed', IOObject);
  };

  var createFilesWatcher = function () {
    helpers.forEach(Object.keys(files), function (type) {
      if(type === 'less' && proxyInstance.options.noLess) {
        return;
      }

      proxyInstance.watch[type] = {
        watcher: chokidar.watch(files[type], { usePolling: proxyInstance.options.fileWatchPolling }),
        changed: false
      };

      proxyInstance.watch[type].watcher.on('change', processChanges.bind(null, type));
    });
  };

  proxyInstance.watch = {};

  helpers.forEach(widgetsList, function (widget) {
    helpers.forEach(Object.keys(widget.widgetFiles), function (type) {
      if(type !== 'locales') {
        files[type] = files[type].concat(widget.widgetFiles[type]);
      }
    });
  });

  var eachThemeFile = function (item) {
    files['theme'].push(item.path);
  };

  try {
    fs.accessSync(path.join(themePath, 'src'), fs.F_OK);
    helpers.walkThemeDir(path.join(themePath, 'src'), eachThemeFile, createFilesWatcher);
  } catch (e) {
    helpers.walkThemeDir(path.join(config.dir.project_root, 'less'), eachThemeFile, createFilesWatcher);
  }
};

Proxy.prototype.getWidget = function (widgetName) {
  var proxyInstance = this;
  var widgetFound = false;

  proxyInstance.widgetsList.some(function (widget) {
    if(widget.widgetName === widgetName) {
      widgetFound = widget;
    }
  });

  return widgetFound;
};

Proxy.prototype.initLocalHTTPSServer = function () {
  var hoxy = require('hoxy');

  var proxyInstance = this;

  var serverOptions = {
    key: fs.readFileSync(proxyInstance.proxyServer.certs.certKey, 'utf8'),
    cert: fs.readFileSync(proxyInstance.proxyServer.certs.certIPFile, 'utf8')
  };

  proxyInstance.httpsServer = hoxy.createServer({
    tls: serverOptions
  }).listen(8005);
}

Proxy.prototype.setSocketIOClientEvents = function () {
  var proxyInstance = this;

  /**
   * Init socket io events
   */
  proxyInstance.initSocketIO(socketIOEvents);

  proxyInstance.listenIOEvent('js-changed-client-pre', function () {
    proxyInstance.watch.js.changed = true;
    proxyInstance.proxyServer.resumeProxy();
  });

  proxyInstance.listenIOEvent('less-changed-client-pre', function () {
    proxyInstance.watch.less.changed = true;
    proxyInstance.proxyServer.resumeProxy();
  });

  proxyInstance.listenIOEvent('template-changed-client-pre', function () {
    proxyInstance.watch.template.changed = true;
    proxyInstance.proxyServer.resumeProxy();
  });

  proxyInstance.listenIOEvent('less-widgets-compile-client', function (data, fn) {
    helpers.replaceLESS.call(proxyInstance, function (err, widgetCSS) {
      if(err) {
        fn(err);
        return;
      }

      fn(widgetCSS);
    });
  });

  proxyInstance.listenIOEvent('run-hologram-client', function (data, fn) {
    var processNewHtml = function () {
      var currentHtml;
      var hologramPath = path.join(config.dir.project_root, 'hologram');
      var currentPath = data.path;

      currentPath = currentPath.substr(currentPath.lastIndexOf('/') + 1);

      if(currentPath === '' || currentPath === '/' || currentPath === 'occ-styleguide') {
        currentPath = 'index.html';
      }

      try {
        currentHtml = fs.readFileSync(path.join(hologramPath, 'docs', currentPath)).toString('utf8');
      } catch(err) {
        proxyInstance.proxyServer.log('there is no html for: ' + currentPath);
      }

      fn(currentHtml);
    };

    helpers.runHologram.call(proxyInstance, processNewHtml);
  });
}

Proxy.prototype.addIOEvent = function (event, fn, data) {
  var proxyInstance = this;
  data = data || { event: event };
  fn = fn || function () {};

  proxyInstance.socket.newClient(event, fn, data);
};

Proxy.prototype.initSocketIO = function (events) {
  var proxyInstance = this;

  proxyInstance.socket = new Socket(proxyInstance, proxyInstance.proxyServer);

  if(events) {
    helpers.forEach(events, function(event) {
      proxyInstance.addIOEvent(event.name, event.fn, event.data);
    });
  }
};

Proxy.prototype.emitIOEvent = function (event, data, done) {
  var proxyInstance = this;
  var io = typeof proxyInstance.socket !== 'undefined' ? proxyInstance.socket.io : {};

  var emitEvent = function (socket) {
    socket.emit(event, data);
    proxyInstance.proxyServer.log('[WS][Client][' + socket.id + '][Emit] connected to ' + event, null, logIOEvents);

    if(done) {
      done.call(proxyInstance, socket);
    }
  };

  // If there are connected sockets, use them, otherwise wait them by
  // emitting the connect event to the proxy(It will be used by the Socket proxy class)
  if(Object.keys(io.sockets).length) {
    var connectedSockets = io.sockets.sockets;
    Object.keys(connectedSockets).forEach(function(id) {
      emitEvent(connectedSockets[id]);
    });
  } else {
    proxyInstance.emit('connect', emitEvent, event);
  }
};

Proxy.prototype.listenIOEvent = function (event, callback) {
  var proxyInstance = this;

  proxyInstance.emit('connect', function (socket) {
    proxyInstance.proxyServer.log('[WS][Client][' + socket.id + '][Listen] connected to ' + event, null, logIOEvents);
    socket.on(event, function (data) {
      proxyInstance.proxyServer.log('[WS][Client][' + socket.id + '][Event]['+ event +'] data: ' + JSON.stringify(data), null, logIOEvents);
      callback.apply(proxyInstance, arguments);
    });
  }, event);
};

/**
 * Set the current environment
 * @param {Object} options
 */
Proxy.prototype.setEnvironment = function (options) {
  this.environment = options;
};

/**
 * Set the proxy Options
 * @param {Object} options [description]
 */
Proxy.prototype.setProxy = function (options) {
  this.proxyOptions = options;
};

/**
 * Set all Widgets
 * @param {Object} widgetsList [description]
 */
Proxy.prototype.setWidgetsOptions = function (widgetsList, done) {
  var proxyInstance = this;

  proxyInstance.widgetsList = [];

  proxyInstance.proxyServer.getWidgetsOptions(widgetsList, function (configuredWidgetsList) {
    proxyInstance.widgetsList = configuredWidgetsList;
    done.call(proxyInstance, configuredWidgetsList);
  });
};

/**
 * Returns each widget
 * @param {Function} done callback to each widget
 */
Proxy.prototype.eachWidget = function (done) {
  var proxyInstance = this;
  var widgetsList = proxyInstance.widgetsList;

  //Implement the errors
  var errors = [];

  //Walk through each widget
  helpers.forEach(widgetsList, function (widgetOptions) {
    done.call(proxyInstance, widgetOptions);
  });

  return {
    end: function (callback) {
      if(callback) {
        callback();
      }
    },

    error: function (callback) {
      if(errors.length && callback) {
        callback(errors);
      }
    }
  };
};

module.exports = Proxy;
