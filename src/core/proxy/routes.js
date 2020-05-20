/**
 * Native dependencies
 */
var fs = require('fs-extra');
var path = require('path');

/**
 * Application dependencies
 */
var glob = require('glob');
var exec = require('child_process').exec;
var serialize = require('serialize-javascript');
var winston = require('winston');

/**
 * Proxy dependencies
 */
var config = require('../config');
var helpers = require('./helpers');
var ExtensionCore = require('../extension');

/**
 * Configurations
 */

//OCC Tools
var occToolsCMD = path.join('./', config.occToolsPath, 'occ-tools-cli');
if(/src/.test(config.occToolsPath)) {
  occToolsCMD = path.join('node ', config.occToolsPath, '..', 'index');
}

var widgetsNames = [];
var forceLessRender = false;

var routes = { };

/**
 * Main html page
 */
routes.mainHtmlPage = function () {
  var proxyInstance = this;

  proxyInstance.proxyServer.setRoute({
    type: 'html',
    method: 'GET',
    url: /^((?!client|\/file\/|occs-admin|\/occ-proxy-panel|.*?\.(html?|template|txt)).)*$/,
    // onlySuccessCode: true,
    callback: function ($, req, resp) {
      //Adding occ proxy context
      $('html').addClass('occpc');

      if(!proxyInstance.options.noLess) {
        //Include widgetsCSS
        $('head').append('<link rel="stylesheet" id="occ-proxy-widgets-css" href="/occ-proxy-widgets-css/widgets.css" />');

        if(proxyInstance.options.theme) {
          $('head').append('<link rel="stylesheet" id="occ-proxy-theme-css" href="/occ-styleguide/theme.css" />');
        }
      }

      //Include widgets area css
      $('head').append('<style id="occ-proxy-widgets-area-css">' + fs.readFileSync(path.join(__dirname, 'static_replaces', 'widgets-area-style.css'), 'utf8') + '</style>');

      proxyInstance.currentMainPage = req.url;

      //Adding socket io scripts
      proxyInstance.socket.addSocketIOScripts($, req, resp);

      var additionalContextInfoScript = fs.readFileSync(path.join(__dirname, 'static_replaces', 'additional-context-info.js'), 'utf8');
      additionalContextInfoScript = additionalContextInfoScript.replace(/#OCC_TOOLS_VERSION/g, config.occToolsVersion);
      additionalContextInfoScript = additionalContextInfoScript.replace(/#OCC_VERSION/g, resp.headers['oraclecommercecloud-version']);
      additionalContextInfoScript = additionalContextInfoScript.replace(/#OCC_TOOLS_PATH/g, config.occToolsPath);
      additionalContextInfoScript = additionalContextInfoScript.replace(/#OCC_TOOLS_PROXY_ENV/g, proxyInstance.options.environment.current);

      var widgetsData = {};
      proxyInstance.eachWidget(function (widget) {
        widgetsData[widget.widgetName] = widget;
        widgetsData[widget.widgetName].$data = {};
        widgetsData[widget.widgetName].activate = '#REMOVE_QUOTEfunction () { oe.tools.setWidgetState(this.widgetName, true)}#REMOVE_QUOTE';
        widgetsData[widget.widgetName].disable = '#REMOVE_QUOTEfunction () { oe.tools.setWidgetState(this.widgetName, false)}#REMOVE_QUOTE';
        widgetsData[widget.widgetName].locales = {};

        if(widget.active) {
          Object.keys(widget.widgetFiles.locales).forEach(function (localeKey) {
            var localePath = widget.widgetFiles.locales[localeKey];
            widgetsData[widget.widgetName].locales[localeKey] = fs.readFileSync(localePath, 'utf8');
          });
        }
      });
      widgetsData = JSON.stringify(widgetsData);
      widgetsData = widgetsData.replace(/"#REMOVE_QUOTE/g, '').replace(/#REMOVE_QUOTE"/g, '');

      additionalContextInfoScript = additionalContextInfoScript.replace(/#WIDGETS/g, widgetsData);

      $('body').append('<script>' + additionalContextInfoScript + '</script>');
      $('body').append('<script>' + fs.readFileSync(path.join(__dirname, 'static_replaces', 'refresh-admin-token.js'), 'utf8') + '</script>');

      // Include toogle overlay button
      $('body').append('<a onclick="oe.tools.toggleWidgetsOverlay(); return false;" class="occ-tools-proxy-toogle-overlay" href="#toogle-overlay">[Overlay]</a>');

      //Hide the preview bar
      if(proxyInstance.options.hidePreviewBar) {
        $('head').append('<style> #previewBar { display: none !important; } #page.preview { padding-top: 0 !important } </style>')
      }

      /**
       * Region Template
       */
      var regionTemplateScript = $('script#region-template');
      var regionTemplateHtml = fs.readFileSync(path.join(__dirname, 'static_replaces', 'region-template-fragment.html'), 'utf8');

      regionTemplateScript.before('<script src="/occ-proxy-manage-widgets.js"></script>');
      regionTemplateScript.text(regionTemplateHtml);

      proxyInstance.proxyServer.setRoute({
        phase: 'request',
        url: 'occ-proxy-manage-widgets.js',
        callback: function (req, resp) {
          var widgetsTemplates = {
              hasWidgets: false,
              templates: {},
              elements: {}
          };

          var occProxyManageWidgetsJSSource = fs.readFileSync(path.join(__dirname, 'static_replaces', 'occ-proxy-manage-widgets.js'), 'utf8');

          proxyInstance.eachWidget(function (widget) {
            var templates = widget.widgetFiles.template;

            if(templates.length && widget.active) {
              widgetsTemplates.hasWidgets = true;
              var templateFile;
              var elementsFile = [];

              if(Array.isArray(widget.widgetFiles.template)) {
                templateFile = widget.widgetFiles.template.filter(function (templateFilePath) {
                  return /display\.template/.test(templateFilePath);
                })[0];

                elementsFile = widget.widgetFiles.template.filter(function (templateFilePath) {
                  return /\/element\//.test(templateFilePath);
                });

              } else {
                templateFile = widget.widgetFiles.template;
              }

              widgetsTemplates.templates[widget.widgetName] = fs.readFileSync(templateFile, 'utf8');

              if(elementsFile.length) {
                widgetsTemplates.elements[widget.widgetName] = [];
              }

              elementsFile.forEach(function (elementPath) {
                var elementName = path.basename(path.resolve(elementPath, '..', '..'));
                var elementObject = {};
                elementObject[elementName] = fs.readFileSync(elementPath, 'utf8');
                widgetsTemplates.elements[widget.widgetName].push(elementObject);
              });
            }
          });

          occProxyManageWidgetsJSSource = occProxyManageWidgetsJSSource.replace(/#data/g, JSON.stringify(widgetsTemplates));

          resp.string = occProxyManageWidgetsJSSource;
        }
      });

      var requestCache = proxyInstance.proxyServer.cache.get(req.url);

      if(requestCache) {
        return;
      }

      proxyInstance.proxyServer.cache.set(req.url, resp.string, resp.headers);
    }
  });
};

/**
 * The main css of the page, it has all widgets css
 */
routes.storefrontCSS = function() {
  var proxyInstance = this;
  var widgetCSS_cache;

  if(proxyInstance.options.noLess) {
    return;
  }

  var promiseHandler = function(resolve, reject) {
    if(!proxyInstance.watch.less.changed && widgetCSS_cache && !forceLessRender) {
      resolve(widgetCSS_cache);
      return;
    }

    if(forceLessRender) {
      proxyInstance.proxyServer.log('forcing less rendering..');
    }

    helpers.replaceLESS.call(proxyInstance, function (err, widgetCSS) {
      if(err) {
        reject(err);
        return;
      }

      widgetCSS_cache = widgetCSS;
      resolve(widgetCSS);

      forceLessRender = false;
      proxyInstance.watch.less.changed = false;
    });
  };

  var replaceOriginalCSS = function (cssString) {
    helpers.forEach(widgetsNames, function (widgetName) {
      var replaceRegExp = new RegExp(widgetName, 'g');
      cssString = cssString.replace(replaceRegExp, widgetName + '-occ-proxy-css');
    });

    return cssString;
  };

  var widgetCSSHandler = function (req, resp, requestCache) {
    var originalCSS = replaceOriginalCSS(requestCache ? requestCache.getData(true) : resp.string);

    if(!requestCache) {
      proxyInstance.proxyServer.cache.set(req.url, originalCSS, resp.headers, { saveAs: 'string' });
    } else {
      resp.headers = requestCache.headers;
    }

    resp.string = originalCSS;
  };

  var errorHandler = function(err) {
    winston.info(err);
  };

  var interceptHandler = function (req, resp) {
    var requestCache = proxyInstance.proxyServer.cache.get(req.url);

    if(requestCache && req.phase === 'response') {
      return;
    }

    if(!requestCache && req.phase === 'request') {
      return;
    }

    //Wait for the less response
    var promise = new Promise(promiseHandler);
    promise.then(widgetCSSHandler.bind(null, req, resp, requestCache), errorHandler);

    return promise;
  };

  /**
   * delivering the cached request
   */
  proxyInstance.proxyServer.setRoute({
    phase: 'response',
    url: '/file/*/css/storefront.css',
    as: 'string',
    contentType: /css/,
    duplicate: true,
    callback: interceptHandler
  });

  /**
   * processing, getting and caching the json page
   */
  proxyInstance.proxyServer.setRoute({
    phase: 'request',
    url: '/file/*/css/storefront.css',
    duplicate: true,
    as: 'string',
    callback: interceptHandler
  });
};

/**
 * Route to the widgets class
 */
routes.widgetsCSS = function() {
  var proxyInstance = this;

  if(proxyInstance.options.noLess) {
    return;
  }

  proxyInstance.proxyServer.setRoute({
    phase: 'request',
    url: 'occ-proxy-widgets-css/widgets.css',
    type: 'string',
    callback: function (req, resp) {
      resp.statusCode = 200;

      return new Promise(function (resolve, reject) {
        helpers.replaceLESS.call(proxyInstance, function (err, css) {
          if(err) {
            reject(err);
            return;
          }

          resolve(css);
        });
      }).then(function (css) {
        resp.string = css;
      });
    }
  });
};

/**
 * Caching logics
 */
routes.caching = function () {
  var proxyInstance = this;

  proxyInstance.proxyServer.setRoute({
    url: /^((?!occs-admin).)*$/,
    proxyCaching: true,
    phase: 'response',
    logs: false,
    duplicate: true,
    onlySuccessCode: true,
    disableHeaderCache: false,
    method: 'GET',
    as: 'buffer',
    callback: function(req, resp) {
      var requestCache = proxyInstance.proxyServer.cache.get(req.url);

      if(requestCache) {
        return;
      }

      if(resp.buffer.length) {
        proxyInstance.proxyServer.cache.set(req.url, resp.buffer, resp.headers);
      }
    }
  });

  proxyInstance.proxyServer.setRoute({
    url: /^((?!occs-admin).)*$/,
    proxyCaching: true,
    phase: 'request',
    logs: false,
    duplicate: true,
    method: 'GET',
    as: 'buffer',
    callback: function(req, resp) {
      var requestCache = proxyInstance.proxyServer.cache.get(req.url);

      if(requestCache) {
        resp.headers = requestCache.headers;
        resp.buffer = requestCache.getData();
      }
    }
  });

  proxyInstance.proxyServer.setRoute({
    phase: 'request',
    url: 'occ-wipe-cache',
    callback: function (req, resp) {
      var params = req.query;

      resp.statusCode = 200;

      if(params.id) {
        proxyInstance.proxyServer.cache.wipe(params.id);
      } else {
        proxyInstance.proxyServer.cache.wipe();
      }

      resp.json = { done: true };
    }
  });
};

/**
 * The panel routes which can be accessed at /occ-proxy-panel
 */
routes.panel = function() {
  var proxyInstance = this;
  var widgetsList = this.widgetsList;

  /**
   * The main document request
   */
  proxyInstance.proxyServer.setRoute({
    url: 'occ-proxy-panel/assets/*',
    phase: 'request',
    logs: false,
    method: 'GET',
    as: 'buffer',
    callback: function(req, resp) {
      var assetPath = req.url.match(/\/occ-proxy-panel\/assets\/(.*)?$/);
      var fileContent;

      if(assetPath) {
        assetPath = path.join('assets', assetPath[1]);

        switch(path.extname(assetPath)) {
          case '.css':
            contentType = 'text/css'
            break;
          case '.js':
            contentType = 'application/javascript'
            break;
          case '.gif':
            contentType = 'image/gif'
            break;
          case '.jpeg':
            contentType = 'image/jpeg'
            break;
          case '.png':
            contentType = 'image/png'
            break;
          default:
            contentType = 'text/html'
        }

        try {
          fileContent = fs.readFileSync(path.join(__dirname, 'panel', assetPath));
          resp.statusCode = 200;
          resp.headers['content-type'] = contentType;
          resp.buffer = fileContent;
        } catch(e) {
          resp.statusCode = 404;
          resp.headers['content-type'] = contentType;
          resp.buffer = new Buffer('Error on requesting the file ' + assetPath , 'utf8');
          return;
        }
      }
    }
  });

  /**
   * The main document request
   */
  proxyInstance.proxyServer.setRoute({
    phase: 'request',
    url: 'occ-proxy-panel',
    type: 'string',
    callback: function (req, resp) {
      resp.statusCode = 200;
      resp.headers['content-type'] = 'text/html';
      var template = 'none';

      try {
        template = fs.readFileSync(__dirname + '/panel/index.html', { encoding: 'utf8' });
      } catch(e) {
        winston.error(e);
      }

      resp.string = template;
    }
  });

  proxyInstance.listenIOEvent('panel-get-proxy-data', function (fn) {
    var mocksList = [];
    var mockRoutesPath = path.join(config.dir.project_root, 'proxy-routes');


    try {
      delete require.cache[require.resolve(mockRoutesPath)];
      mocksList = require(mockRoutesPath);
    } catch(e) {}

    fn({
      widgets: widgetsList,
      cacheList: proxyInstance.proxyServer.cache.getCacheList(),
      mocksList: mocksList,
      mocksDir: config.dir.mocks,
      proxyOptions: proxyInstance.options
    });
  });

  proxyInstance.listenIOEvent('panel-get-extension-information', function (extensionName, fn) {
    var extension = new ExtensionCore();
    extension.get(extensionName, fn);
  });

  proxyInstance.listenIOEvent('panel-save-mock', function (mockDescriptor, fn) {
    fn = fn || function () {};
    var proxyRoutesFilePath = path.join(config.dir.project_root, 'proxy-routes.js');
    var isUpdating = mockDescriptor.update;

    // Ensure that will work with both url and key
    mockDescriptor.key = mockDescriptor.key || mockDescriptor.url;
    mockDescriptor.mockFilePath = mockDescriptor.mockFilePath || mockDescriptor.filePath;

    var createNewProxyRouteFile = function () {
      var proxyRoutesStructure = 'module.exports = [];';
      fs.writeFileSync(proxyRoutesFilePath, proxyRoutesStructure);
    };

    var getProxyRoutes = function (string) {
      var proxyRoutesString = fs.readFileSync(proxyRoutesFilePath, 'utf8');

      if(!string) {
        return eval(proxyRoutesString);
      }

      return proxyRoutesString;
    };

    var copyDataFile = function () {
      try {
        fs.copySync(mockDescriptor.dataFile, mockDescriptor.mockFilePath);
      } catch(e) {
        winston.error(e);
      }
    };

    try {
      fs.accessSync(proxyRoutesFilePath, fs.F_OK);
    } catch (e) {
      createNewProxyRouteFile();
    }

    if(!isUpdating) {
      // Copy the data file to the /mocks path
      copyDataFile();
    }

    var proxyRoutes = getProxyRoutes();
    var proxyRouteFilePath = mockDescriptor.mockFilePath;

    // Try to find the mock, if found and is not updating, just set as disabled, otherwise use
    // the mockDescriptor the get status
    proxyRoutes.some(function(route) {
      if(route.url === mockDescriptor.key && !isUpdating) {
        route.enabled = false;
        return true;
      }

      if(mockDescriptor.filePath === route.filePath && route.url === mockDescriptor.key && isUpdating) {
        route.enabled = mockDescriptor.enabled;
        return true;
      }
    });

    // If it's not with the isAbsolute flag, just keep this relative;
    if(!mockDescriptor.isAbsolute) {
      proxyRouteFilePath = path.relative(config.dir.project_root, proxyRouteFilePath);
    }

    if(!isUpdating) {
      // Create new mock
      proxyRoutes.push({
        url: mockDescriptor.key,
        filePath: proxyRouteFilePath,
        enabled: false,
        isAbsolute: mockDescriptor.isAbsolute
      });
    }

    proxyRoutes = serialize(proxyRoutes, { space: 2, unsafe: true });
    var proxyRoutesString = getProxyRoutes(true).replace(/module\.exports[\s\S]*/, 'module.exports = ' + proxyRoutes);

    fs.writeFileSync(proxyRoutesFilePath, proxyRoutesString);
    fn(false, 'done');
  });

  proxyInstance.listenIOEvent('panel-get-cache-content', function (cacheId, fn) {
    fn = fn || function () {};
    if(typeof cacheId === 'string') {
      var cacheFile = proxyInstance.proxyServer.cache.get(cacheId, true);
      if(!cacheFile) {
        return fn(true, 'cache id "' + cacheId + '" doesn\'t exist.');
      }

      return fn(false, cacheFile.getData(true));
    }
    fn(true, 'Please provide a cache id');
  });

  var getMockFullPath = function (mock, mockData) {
    if(mockData.isAbsolute) {
      return mock.filePath;
    }

    return path.join(config.dir.project_root, mock.filePath);
  };

  var getMock = function(mockData) {
    try {
      var proxyRoutes = require(path.join(config.dir.project_root, 'proxy-routes'));

      if(proxyRoutes.length) {
        var foundMock = proxyRoutes.filter(function (proxyRoute) {
          return proxyRoute.url === mockData.url && proxyRoute.filePath === mockData.filePath;
        });

        if(!foundMock.length) {
          return false;
        }

        return foundMock[0];
      } else {
        return false;
      }
    } catch(e) {
      return false;
    }
  };

  proxyInstance.listenIOEvent('panel-update-mock-descriptor', function (mockData, fn) {
    fn = fn || function () {};
    var mock = getMock(mockData);

    if(!mock) {
      return fn(true, 'No mocks found');
    }

    fn(false, fs.readFileSync(mockPath, 'utf8'));
  });

  proxyInstance.listenIOEvent('panel-get-mock-content', function (mockData, fn) {
    fn = fn || function () {};
    var mock = getMock(mockData);

    if(!mock) {
      return fn(true, 'No mocks found');
    }
    var mockPath = getMockFullPath(mock, mockData);
    fn(false, fs.readFileSync(mockPath, 'utf8'));
  });

  proxyInstance.listenIOEvent('panel-mock-update-content', function (mockData, content, fn) {
    fn = fn || function () {};
    var mock = getMock(mockData);

    if(!mock) {
      return fn(true, 'No mocks found');
    }

    var mockPath = getMockFullPath(mock, mockData);
    fs.writeFileSync(mockPath, typeof content !== 'string' ? JSON.stringify(content, null, 2) : content);
    fn(false, 'done');
  });

  proxyInstance.listenIOEvent('panel-mock-wipe-client', function (mockData, fn) {
    fn = fn || function () {};
    var proxyRoutesFilePath = path.join(config.dir.project_root, 'proxy-routes.js');
    var mocksDir = config.dir.mocks;

    var getProxyRoutes = function () {
      return eval(fs.readFileSync(proxyRoutesFilePath, 'utf8'));
    };

    try {
      fs.accessSync(proxyRoutesFilePath, fs.F_OK);
    } catch (e) {
      return fn(true, 'No Proxy Routes Found');
    }

    var proxyRoutes = getProxyRoutes();

    if(mockData) {
      var foundRoute = proxyRoutes.some(function(route, index) {
        if(route.url === mockData.url && route.filePath === mockData.filePath) {
          var mockPath = getMockFullPath(route, mockData);
          fs.removeSync(mockPath);
          proxyRoutes.splice(index, 1);
          return true;
        }
      });

      if(!foundRoute) {
        return fn(true, 'No Proxy Route Found for ' + mockData);
      }
    } else {
      proxyRoutes = [];
      fs.removeSync(mocksDir);
    }

    proxyRoutes = JSON.stringify(proxyRoutes, null, 2);
    fs.writeFileSync(proxyRoutesFilePath,`module.exports = ${proxyRoutes}`);
    fn(false, 'done');
  });

  proxyInstance.listenIOEvent('panel-widget-update-region-client', function (widgetData, fn) {
    proxyInstance.widgetsList.some(function (widget) {
      if(widget.widgetName === widgetData.widgetName) {
        widget.regionName = widget.regionName ? widget.regionName + ',' + widgetData.regionName : widget.regionName;
        fn('region set');
        proxyInstance.emitIOEvent('panel-widget-updated', widget);
      }
    });
  });

  proxyInstance.listenIOEvent('panel-widget-update-status-client', function (widgetData, fn) {
    proxyInstance.widgetsList.some(function (widget) {
      if(widget.widgetName === widgetData.widgetName) {
        widget.active = widgetData.active;
        forceLessRender = true;

        fn('changed');
      }
    });
  });

  proxyInstance.listenIOEvent('panel-widget-updated-check-client', function (data, fn) {
    fn(proxyInstance.widgetsList);
  });

  proxyInstance.listenIOEvent('panel-upload-widget-client', function (widget, done) {
    var child = exec(''.concat(occToolsCMD, ' upload widget ', widget.widgetName), { encoding: 'utf8' });

    child.stdout.on('data', function(data) {
      proxyInstance.emitIOEvent('panel-upload-widget-status', data, false);
    });

    child.stderr.on('data', function(data) {
      proxyInstance.emitIOEvent('panel-upload-widget-status', data, false);
    });

    child.on('close', function () {
      done(true);
    });
  });

  proxyInstance.listenIOEvent('panel-generate-extension-client', function (extensionData, done) {
    var widgetsPath = path.join('widgets', 'objectedge');
    var generateCommand = '' . concat(
      'cd ', config.dir.project_root, ' && ',
      occToolsCMD,
      ' generate extension ', extensionData.extensionId,
      ' --dir ', widgetsPath,
      ' --widgets ', extensionData.widgetName,
      ' --name ', extensionData.widgetName);

    var child = exec(generateCommand, { encoding: 'utf8' });

    child.stdout.on('data', function(data) {
      proxyInstance.emitIOEvent('panel-generate-extension-status', data, false);
    });

    child.stderr.on('data', function(data) {
      proxyInstance.emitIOEvent('panel-generate-extension-status', data, false);
    });

    child.on('close', function () {
      done(true);
    });
  });

  proxyInstance.listenIOEvent('panel-cache-wipe-client', function (key, fn) {
    proxyInstance.proxyServer.cache.wipe(key, fn);
  });

  proxyInstance.listenIOEvent('panel-cache-pause-client', function (key, fn) {
    proxyInstance.proxyServer.cache.pauseCache(key, fn);
  });

  proxyInstance.listenIOEvent('panel-cache-update-content', function (key, content, fn) {
    proxyInstance.proxyServer.cache.updateFileContent(key, typeof content !== 'string' ? JSON.stringify(content) : content, fn);
  });

  proxyInstance.proxyServer.cache.on('cacheCreated', function (data) {
    proxyInstance.emitIOEvent('panel-cache-created', data);
  });

  proxyInstance.proxyServer.cache.on('cacheUpdated', function (data) {
    proxyInstance.emitIOEvent('panel-cache-updated', data);
  });

  proxyInstance.listenIOEvent('panel-cache-resume-client', function (key, fn) {
    proxyInstance.proxyServer.cache.resumeCache(key, fn);
  });

  proxyInstance.listenIOEvent('panel-change-config-client', function (configObject, fn) {
    var configs = {
      currentEnv: function () {
        proxyInstance.options.environment.current = configObject.value;
        fn('done');
      },
      useCache: function () {
        proxyInstance.options.cache.enabled = configObject.value;

        if(proxyInstance.proxyServer.cache.currentStatus() !== configObject.value) {
          if(configObject.value === true) {
            proxyInstance.proxyServer.log('enabling cache..');
            proxyInstance.proxyServer.cache.enable();
          } else {
            proxyInstance.proxyServer.log('disabling cache..');
            proxyInstance.proxyServer.cache.disable();
          }
        }

        fn('done');
      },
      useAutoJSReload: function () {
        proxyInstance.options.reload.js = configObject.value;
        fn('done');
      },
      useAutoLessReload: function () {
        proxyInstance.options.reload.less = configObject.value;
        fn('done');
      },
      useAutoTemplateReload: function () {
        proxyInstance.options.reload.template = configObject.value;
        fn('done');
      },
      useAutoThemeReload: function () {
        proxyInstance.options.reload.theme = configObject.value;
        fn('done');
      },
      hidePreviewBar: function () {
        proxyInstance.options.hidePreviewBar = configObject.value;
        fn('done');
      },
      proxyAppLevel: function () {
        proxyInstance.options.proxyOptions.appLevel = configObject.value;
        routes.appLevel.call(proxyInstance);
        fn('done');
      }
    };

    if(typeof configs[configObject.config] === 'undefined') {
      fn('this config is not allow to be changed');
      return;
    }

    configs[configObject.config]();
  });
};

/**
 * Set a route to replace the remote js file by the local one
 */
routes.javascript = function () {
  var proxyInstance = this;

  var processWidgetJS = function (widgetJSFullPath, widgetOptions) {
    var widgetJS = path.basename(widgetJSFullPath).replace('.js', '');

    //Replace Source Map
    if(/\.map/.test(widgetJSFullPath)) {
      proxyInstance.proxyServer.setRoute({
        phase: 'request',
        url: '**/' + widgetOptions.widgetName + '/js/' + widgetJS.replace('.map', '') + '*.js.map',
        type: 'replace',
        replaceFilePath: widgetJSFullPath,
        skip: function () {
          return !widgetOptions.active;
        },
        callback: function () {
          proxyInstance.emitIOEvent('panel-widget-updated', widgetOptions);
        }
      });

      return;
    }

    //Replace for elements
    if(/element\.js/.test(widgetJSFullPath)) {
      var elementName = path.basename(path.resolve(widgetJSFullPath, '../..'));

      proxyInstance.proxyServer.setRoute({
        phase: 'request',
        url: '**/element/' + elementName + '/js/element*.js',
        type: 'replace',
        replaceFilePath: widgetJSFullPath,
        skip: function () {
          return !widgetOptions.active;
        }
      });
    }

    //Wait for the JS request and replace it by the local one
    proxyInstance.proxyServer.setRoute({
      phase: 'request',
      url: '**/' + widgetOptions.widgetName + '/js/' + widgetJS + '*.js',
      type: 'replace',
      replaceFilePath: widgetJSFullPath,
      skip: function () {
        return !widgetOptions.active;
      },
      callback: function (req) {
        proxyInstance.emitIOEvent('panel-widget-updated', widgetOptions);
      }
    });
  };

  proxyInstance.eachWidget(function (widgetOptions) {
    var widgetFiles = widgetOptions.widgetFiles;

    helpers.forEach(widgetFiles.js, function (widgetJS) {
      processWidgetJS(widgetJS, widgetOptions);
    });
  });
};

/**
 * Set a route to replace the remote app level file by the local one
 */
routes.appLevel = function () {
  var proxyInstance = this;
  var appLevelBasePath = path.join(config.dir.project_root, 'app-level');

  if(!proxyInstance.options.proxyOptions.appLevel) {
    return;
  }

  glob(path.join(appLevelBasePath, '*'))
    .on('match', function (appLevelPath) {
      try {
        var appLevelName = path.basename(appLevelPath);

        proxyInstance.proxyServer.transpileAppLevel(appLevelName, appLevelPath, function (err, appLevelCompiledPath) {
          proxyInstance.proxyServer.setRoute({
            phase: 'request',
            url: '**/global/' + appLevelName + '.min.js*',
            type: 'replace',
            replaceFilePath: appLevelCompiledPath
          });

          proxyInstance.proxyServer.log('App Level ' + appLevelName + ' transpiled.');
        });
      } catch(err) {

      }
    });
};

/**
 * Set a route to replace the remote template file by the local one
 */
routes.template = function () {
  var proxyInstance = this;

  var processWidgetTemplate = function (widgetTemplateFullPath, widgetOptions) {
    var widgetTemplate = path.basename(widgetTemplateFullPath);

    //Wait for the JS request and replace it by the local one
    proxyInstance.proxyServer.setRoute({
      phase: 'request',
      url: '**/' + widgetOptions.widgetName + '/templates/' + widgetTemplate,
      type: 'replace',
      replaceFilePath: widgetTemplateFullPath,
      skip: function () {
        return !widgetOptions.active;
      },
      callback: function (req, resp) {
        proxyInstance.emitIOEvent('panel-widget-updated', widgetOptions);
      }
    });
  };

  proxyInstance.eachWidget(function (widgetOptions) {

    var widgetPath = widgetOptions.widgetPath;
    var widgetFiles = widgetOptions.widgetFiles;

    helpers.forEach(widgetFiles.template, function (widgetTemplate) {
      processWidgetTemplate(widgetTemplate, widgetOptions);
    });
  });
};

/**
 * Set a route to styleguide
 */
routes.styleguide = function () {
  var proxyInstance = this;
  var hologramPath = path.join(config.dir.project_root, 'hologram');
  var originalStorefrontStyleguide;

  try {
    originalStorefrontStyleguide = fs.readFileSync(path.join(hologramPath, 'build', 'storefront.css'));
  } catch(err) {
    proxyInstance.proxyServer.log('there is no styleguide yet');
  }

  /**
   * The main document request
   */
  proxyInstance.proxyServer.setRoute({
    phase: 'request',
    url: /occ-styleguide/,
    as: 'buffer',
    callback: function (req, resp) {
      resp.statusCode = 200;

      if(/theme\.css/.test(req.url)) {
        return;
      }

      var currentUrlPath = req.url.replace(/occ-styleguide\/?/, '').replace(/\?new.*/, '');
      var pathToDocs = path.join(hologramPath, 'docs');

      if(currentUrlPath === '' || currentUrlPath === '/') {
        currentUrlPath = 'index.html';
      }

      try {
        var docToRead = fs.readFileSync(path.join(pathToDocs, currentUrlPath));

        if(/\.html/.test(currentUrlPath)) {
          docToRead = docToRead.toString('utf8');
          docToRead = docToRead.replace(/(href)="(?!#|https?)\/?/g, '$1="/occ-styleguide/');
          docToRead = docToRead.replace(/appLevel:\s?'(.*)?'/g, "appLevel: '/occ-styleguide/app-level'");

          var $ = require('cheerio').load(docToRead, { decodeEntities: false });
          $('html').addClass('occpc');
          $('head').append('<link rel="stylesheet" id="occ-proxy-theme-css" href="/occ-styleguide/theme.css" />');

          //Adding socket io scripts
          proxyInstance.socket.addSocketIOScripts($, req, resp);

          resp.buffer = new Buffer($.html(), 'utf8');
          return;
        }

        resp.buffer = docToRead;
      } catch(err) {
        proxyInstance.proxyServer.log('That file: ' + path.join(pathToDocs, currentUrlPath) + ' doesn\'t exist.');
        resp.buffer = new Buffer('Error on requesting the file ' + path.join(pathToDocs, currentUrlPath), 'utf8');
      }
    }
  });

  proxyInstance.proxyServer.setRoute({
    phase: 'request',
    url: 'occ-styleguide/theme.css',
    type: 'string',
    callback: function (req, resp) {
      resp.statusCode = 200;

      return new Promise(function (resolve, reject) {
        helpers.replaceLESS.call(proxyInstance, function (err, css) {
          if(err) {
            reject(err);
            return;
          }

          resolve(css);
        }, { renderTheme: true });
      }).then(function (css) {
        if(!originalStorefrontStyleguide) {
          originalStorefrontStyleguide = '';
        }

        resp.string = originalStorefrontStyleguide + '\n\n\n' + css;
      });
    }
  });
};

/**
* Allows extra routes to proxy
*/
routes.extraRoutes = function () {
  var proxyInstance = this;

  if(!proxyInstance.options.extraRoutes) {
    return;
  }

  var extraRoutes;
  var extraRoutesPath = proxyInstance.options.extraRoutes;
  var defaultextraRoutesPath = path.join(config.dir.project_root, 'proxy-routes');
  var isDefaultPath = extraRoutesPath !== defaultextraRoutesPath;

  try {
    extraRoutes = require(extraRoutesPath);
  } catch(error) {
    // Only throw error if it's different than the default
    if(isDefaultPath) {
      winston.error('Error on trying to require ' + proxyInstance.options.extraRoutes);
      winston.info(error);
    }
    return;
  }

  if(!Array.isArray(extraRoutes) && !isDefaultPath) {
    winston.error('--extraRoutes command - The Routes must be an array');
    return;
  }

  extraRoutes.forEach(function (route) {
    var proxyOptions = {
      phase: route.phase || 'request',
      url: route.url,
      type: route.type || 'replace'
    };

    // Don't do anything if the route is disabled
    if(!route.enabled) {
      return;
    }

    if(route.process) {
      proxyOptions.callback = function (req, resp) {
        var resolver = function (data) {
          if(data.headers) {
            resp.headers = data.headers;
          }

          if(data.statusCode) {
            resp.statusCode = data.statusCode;
          }

          if(typeof data.body === 'object') {
            if(!resp.headers['content-type']) {
              resp.headers['content-type'] = 'application/json';
            }

            resp.json = data.body;
          } else {
            resp.string = data.body;
          }
        };

        return new Promise(route.process.bind(route))
          .then(resolver)
          .catch(function (data) {
            var data = data || {};
            resp.statusCode = data.statusCode || 500;

            if(data.body) {
              resolver(data);
              return;
            }

            resp.json = { error: true, message: 'Internal Server Error' };
          });
      }
    }

    if(route.filePath) {
      route.filePath = path.join(route.basePath || config.dir.project_root, route.filePath);

      if(route.isAbsolute) {
        route.filePath = route.filePath;
      }

      try {
        fs.readFileSync(route.filePath);
      } catch(error) {
        winston.error('Error on loading file ' + route.filePath);
        return;
      }
    }

    if(route.filePath && !route.process) {
      proxyOptions.serveFile = route.filePath;
    }

    if(!route.filePath && proxyOptions.type === 'replace' || (route.filePath && route.process)) {
      proxyOptions.type = 'string';
    }

    proxyInstance.proxyServer.setRoute(proxyOptions);
  });
};

routes.proxyPacFile = function () {
  var proxyInstance = this;

  proxyInstance.proxyServer.setRoute({
    phase: 'request',
    url: config.proxy.pacUrlPath,
    type: 'replace',
    replaceFilePath: config.proxy.pacFile,
    hostname: /.*/
  });
};
module.exports = routes;
