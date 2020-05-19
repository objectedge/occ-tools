var fs = require('fs-extra');
var util = require('util');
var path = require('path');
var hoxy = require('hoxy');
var winston = require('winston');
var UglifyJS = require('uglify-js');
var webpack = require('webpack');
var jsesc = require('jsesc');

var Cache = require('./cache');
var execSync = require('child_process').execSync;

var config = require('../config');
var Bundler = require('../bundler');

//We're requiring our own cheerio because hoxy aren't loading
//the html with decodeEntities: false with ends up breaking the html
var cheerio = require('cheerio');

var requests = [];

function OCCProxy(options) {
  var proxyInstance = this;
  options = options || {};

  this.proxyServer = {};
  this.widgetFound = false;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  //On Errors
  process.on('uncaughtException', function (err) {
    if(err.code === 'ECONNRESET') {
      proxyInstance.log('cancelling the request because of some action on the web browser... maybe some unexpected refresh or something like that ');
    }
  });

  process.on('unhandledRejection', error => {
    console.log('\n');
    console.log('ERROR', error);
    console.log('\n');
  });

  this.requests = [];
  this.ignoredProxyCaching = [];
  this.proxyStatus = 'starting';

  this.cache = new Cache(options.cache);
}

OCCProxy.prototype.log = function (message, returnMessage, log) {
  var message = 'OCC PROXY ----> ' + message;

  if(typeof log !== 'undefined' && !log) {
    return;
  }

  if(returnMessage) {
    return message;
  }

  winston.info(message);
};

OCCProxy.prototype.startProxy = function () {
  var proxyInstance = this;
  proxyInstance.certs = this.ensureCerts();

  proxyInstance.log('Starting proxy server for domain ' + proxyInstance.env.baseUrl);

  //Create Server
  this.proxyServer = hoxy.createServer({
    certAuthority: {
      key: fs.readFileSync(proxyInstance.certs.certKey, 'utf8'),
      cert: fs.readFileSync(proxyInstance.certs.certFile, 'utf8')
    }
  }).listen(proxyInstance.proxyOptions.port, function () {
    proxyInstance.log('running proxy server on port => ' + proxyInstance.proxyOptions.port);
    proxyInstance.log('Starting proxy routing..\n');
    proxyInstance.setProxyStatus('running');
  });

  this.proxyServer.intercept('request', function(req) {
    // I don't know yet, but Node.js header parser is complaining about this
    // When it's send on the request header, the following error is thrown HPE_INVALID_HEADER_TOKEN.
    // The x-requested-with is non-standard field and that might be the issue
    // We are removing this header for now.
    delete req.headers['x-requested-with'];
  });

  // Encodes any unicode character
  // This comes from Incapsula
  this.proxyServer.intercept('response', function(req, resp) {
    var cookies = resp.headers['set-cookie'];
    if(cookies) {
      resp.headers['set-cookie'] =
        cookies.map(function(cookie){ return jsesc(cookie); });
    }
  });
};

OCCProxy.prototype.isProxyPaused = function () {
  return this.proxyStatus === 'paused';
};

OCCProxy.prototype.setPauseRule = function (rule) {
  this.pauseRule = rule;
};

OCCProxy.prototype.pauseProxy = function (url) {
  if(this.proxyStatus === 'paused') {
    return;
  }

  this.log('PROXY PAUSED on requesting url ' + url + '.'
          + ' It matches the condition: '
          + 'if the test ' + this.pauseRule + '.test("' + url + '") === true then pause');

  this.setProxyStatus('paused');
};

OCCProxy.prototype.resumeProxy = function () {
  if(this.proxyStatus === 'running') {
    return;
  }

  this.log('PROXY RESUMED!!');

  this.setProxyStatus('running');
};

OCCProxy.prototype.setProxyStatus = function (status) {
  this.proxyStatus = status;
};

OCCProxy.prototype.ensureCerts = function () {
  var currentInstance = this;
  var certFolder = config.proxy.certsDir;
  var currentIP = config.currentIP;

  var certs = {
    certKey: path.join(certFolder, 'ca.key.pem'),
    certFile: path.join(certFolder, 'ca.crt.pem'),
    certIPFile: path.join(certFolder, 'ca.ip.' + currentIP + '.crt.pem')
  };

  var sslCreate = function (options, done, error) {
    var domain = !options.ip ? 'example.com' : config.currentIP;

    var commandString = {
      key: 'openssl genrsa -out ' + options.certFile + ' 2048',
      cert: 'openssl req -x509 -new -nodes -key ' + certs.certKey + ' -days 1024 -out ' + options.certFile + ' -subj "/C=US/ST=Utah/L=Provo/O=ACME Signing Authority Inc/CN=' + domain + '"'
    };

    currentInstance.log('Creating cert ' + options.certFile + '...');

    var command = execSync(commandString[options.type], { encoding: 'utf8' });

    if(command.error) {
      winston.error(command.error)
      error.call(null, options.certFile, command.stderr);
      return;
    }

    done.call(null, options.certFile, command.stdout);
  };

  var onDone = function (cert, message) {
    currentInstance.log('Cert ' + cert + ' has been created', message);
  };

  var onError = function (cert, message) {
    winston.error('An error has been occurred when creating cert ' + cert, message);
  };

  //Ensure the cert path creation
  fs.ensureDirSync(certFolder);

  Object.keys(certs).forEach(function (certIndex) {
    var cert = certs[certIndex];

    try {
      fs.accessSync(cert, fs.F_OK);
    } catch (e) {
      sslCreate({
        certFile: cert,
        type: certIndex === 'certKey' ? 'key' : 'cert',
        ip: certIndex === 'certIPFile'
      }, onDone, onError);
    }
  });

  return certs;
};

OCCProxy.prototype.setEnvOptions = function (options) {
  options = options || {
    current: 'dev',
    baseUrl: ''
  };

  options.currentIP = config.currentIP;
  options.baseUrl = options.baseUrl.replace(/https?:\/\//, '');
  this.env = options;
};

OCCProxy.prototype.setProxyOptions = function (options) {
  options = options || {
    port: 8001,
    certAuthority: null
  };

  this.proxyOptions = options;
};

OCCProxy.prototype.getWidgetsOptions = function (widgets, done) {
  var currentInstance = this;
  var totalWidgets = widgets.length;
  var widgetIteration = 0;
  var widgetList = [];

  currentInstance.log('processing all ES6 widgets...');

  currentInstance.setWidgetsTranspiler(widgets, function () {
    widgets.forEach(function (widget, index) {
      currentInstance.getWidgetOptions(widget, function (widgetOptions) {
        widgetIteration++;

        widgetList.push(widgetOptions);

        if(widgetIteration === totalWidgets) {
          done(widgetList);
        }
      });
    });
  });
};


/**
 * Create the index file containing the app level
 * dependencies
 * @param  {Array} filesList each file
 * @return {String}           the index file content
 */
function createJsBundleIndexFile(filesList) {
  var appLevelIndexTemplate = fs.readFileSync(path.join(__dirname, '../extension/templates/app-level-index.js'), 'utf-8');

  var dependenciesImports = [];
  var allDependencies = [];
  var dependenciesApp = [];

  filesList.forEach(function (fileObject) {
    var fileName = fileObject.fileName;

    dependenciesImports.push("import " + fileName + " from '" + fileObject.path + "';");
    allDependencies.push(fileName);
    dependenciesApp.push("app['" + fileName + "'] = " + fileName + ";");
  });

  dependenciesImports = dependenciesImports.join('\n');
  allDependencies = allDependencies.join(',');
  dependenciesApp = dependenciesApp.join('\n');

  appLevelIndexTemplate = appLevelIndexTemplate.replace(/#dependenciesImports/g, dependenciesImports);
  appLevelIndexTemplate = appLevelIndexTemplate.replace(/#allDependencies/g, allDependencies);
  appLevelIndexTemplate = appLevelIndexTemplate.replace(/#dependenciesApp/g, dependenciesApp);

  return appLevelIndexTemplate;
}

function bundleAppLevel(appLevelPath, appLevelName, done) {
  var proxyInstance = this;
  var occToolsModulesPath = path.join(config.occToolsPath, '..' ,'node_modules');

  var plugins = [];
  plugins.push(new webpack.dependencies.LabeledModulesPlugin());
  plugins.push(new webpack.optimize.UglifyJsPlugin({
    compress: {
      warnings: false
    },
    output: {
      comments: false
    }
  }));

  var entryFile = appLevelPath;
  var outputPath = path.join(config.dir.project_root, '.occ-transpiled', 'app-level', appLevelName);
  var outputFile = path.join(outputPath, appLevelName + '.js');

  var webpackConfigs = {
    resolveLoader: {
      root: [
        occToolsModulesPath
      ]
    },
    entry: entryFile,
    output: {
      path: outputPath,
      filename: appLevelName + '.js',
      libraryTarget: "amd"
    },
    externals: [
      /^((\/file)|(\/oe-files)|(?!\.{1}|occ-components|(.+:\\)|\/{1}[a-z-A-Z0-9_.]{1})).+?$/
    ],
    module: {
      loaders: [{
        test: /\.js$/,
        loader: 'babel-loader',
        include: [
          appLevelPath,
          path.join(config.dir.project_root, 'app-level', appLevelName)
        ],
        query: {
          presets: [path.join(occToolsModulesPath, 'babel-preset-es2015')],
          plugins: [
            path.join(occToolsModulesPath, 'babel-plugin-transform-decorators-legacy'),
            path.join(occToolsModulesPath, 'babel-plugin-transform-class-properties')
          ],
          cacheDirectory: true
        },
      }]
    },
    plugins: plugins,
    devtool: '#eval-source-map'
  };

  var bundler = webpack(webpackConfigs);

  bundler.watch({
    aggregateTimeout: 300,
    poll: false
  }, function(error, stats) {
    if(error) {
      done(error, null);
      return;
    }

    winston.info('\n\n');
    winston.info('[bundler:compile] Changes ----- %s ----- \n', new Date());
    winston.info('[bundler:compile] %s', stats.toString({
      chunks: true, // Makes the build much quieter
      colors: true
    }));

    done(null, outputFile, appLevelName, outputFile, entryFile, stats);
  });
}

OCCProxy.prototype.transpileAppLevel = function (appLevelName, appLevelPath, done) {
  var filesList = [];
  var outputPath = path.join(config.dir.project_root, '.occ-transpiled', 'app-level', appLevelName);
  var appLevelEntry = path.join(outputPath, 'index.js');
  var currentAppLevelExtensionDir = path.join(appLevelPath);
  var configs = {};
  var configsPath = path.resolve(appLevelPath, 'configs.json');

  if (fs.existsSync(configsPath)) {
    var contents = fs.readFileSync(configsPath, 'utf8');

    try {
      contents = JSON.parse(contents);

      if (contents) {
        configs = Object.assign({}, configs, contents);
      }
    } catch(err) {
      winston.error(util.format('Error parsing appLevel configuration file. Please check %s configuration\'s integrity.', appLevelName));
    }
  }

  fs.walk(currentAppLevelExtensionDir).on('data', function (item) {
    if (new RegExp(configsPath).test(item.path)) return;

    if(item.stats.isFile() && /\.js/.test(item.path)) {
      var jsName = path.basename(item.path, '.js');

      if (/vendors/.test(item.path) && !/\.min\.js/.test(item.path) && configs.uglify !== false) {
        var minifiedFile = UglifyJS.minify(item.path, configs.uglify);
        var tempFileDir = path.join(outputPath, 'vendors');

        item.path = path.resolve(tempFileDir, jsName + '.min.js');

        fs.ensureDirSync(tempFileDir);
        fs.writeFileSync(item.path, minifiedFile.code);
      }

      jsName = jsName.replace(/[^\w\s]/g, '');

      filesList.push({
        fileName: jsName,
        path: item.path
      });
    }
  }).on('end', function () {
    var appLevelIndexTemplate = createJsBundleIndexFile(filesList);

    fs.ensureDirSync(outputPath);

    fs.writeFile(appLevelEntry, appLevelIndexTemplate, { encoding: 'utf8' }, function (error) {
      if(error) {
        winston.error('Error on generating app-level: ' + error);
        return;
      }

      bundleAppLevel(outputPath, appLevelName, done);
    });
  });
};

OCCProxy.prototype.setWidgetsTranspiler = function (widgetsList, done) {
  var proxyInstance = this;
  var es6WidgetsList = widgetsList.filter(function (widgetObject) {
    return widgetObject.widgetMeta && widgetObject.widgetMeta.ES6;
  });
  var totalES6Widgets = es6WidgetsList.length;

  if(!totalES6Widgets) {
    done.call(proxyInstance, widgetsList);
    return;
  }

  es6WidgetsList.forEach(function(widgetObject, index) {
    var bundler = new Bundler({
      source: '/js',
      debug: true,
      dest: '/js',
      watch: true,
      polling: false,
      sourceMapType: '#eval-source-map',
      widgets: widgetObject.widgetName
    });
    var firstRun = true;
    var releaseProxyRunner = function () {
      if(firstRun) {
        done.call(proxyInstance, widgetsList);
        firstRun = false;
      }
    };

    winston.info('[bundler:compile:es6] Setting Webpack watcher for ' + widgetObject.widgetName);

    bundler.on('complete', function(stats) {
      winston.info('\n\n');
      winston.info('[bundler:compile:es6] Changes ----- %s ----- \n', new Date());
      winston.info('[bundler:compile:es6] %s', stats.toString({
        chunks: true, // Makes the build much quieter
        colors: true
      }));

      if(totalES6Widgets === index + 1) {
        releaseProxyRunner();
      }
    });

    bundler.on('error', function(err) {
      winston.error('[bundler:error:es6]', err);
      releaseProxyRunner();
    });

    bundler.compile();
  });
}

OCCProxy.prototype.getWidgetOptions = function (options, done) {
  if(!options.widgetPath && !options.widgetName && !options.regionName && options.extensionName) {
    winston.error('widgetPath, widgetName, regionName and extensionName should be passed');
    return;
  }

  var isES6 = options.widgetMeta.ES6;

  options.widgetFiles = {
    js: [],
    template: [],
    less: [],
    locales: {}
  };

  options.active = typeof options.active !== 'undefined' ? options.active : false;

  var processTranspileJSs = function () {
    var widgetJSPath = path.join(config.dir.project_root, '.occ-transpiled', 'widgets', options.widgetName);

    fs.walk(widgetJSPath).on('data', function (item) {
      if(item.stats.isFile()) {
        options.widgetFiles.js.push(item.path);
      }
    }).on('end', function () {
      done(options);
    });
  };

  //Populate all templates and js files
  fs.walk(path.join(options.widgetPath)).on('data', function (item) {
    if(item.stats.isFile()) {
      const dash = path.sep;
      if(item.path.indexOf(`${dash}js${dash}`) > -1 && !isES6) {

        //Ignore SRC folder for now
        if(item.path.indexOf(`${dash}js${dash}src`) > -1) {
          return;
        }

        options.widgetFiles.js.push(item.path);
      }

      if(item.path.indexOf(`${dash}templates${dash}`) > -1) {
        options.widgetFiles.template.push(item.path);
      }

      if(item.path.indexOf(`${dash}less${dash}`) > -1) {
        options.widgetFiles.less.push(item.path);
      }

      if(item.path.indexOf(`${dash}${options.widgetName}${dash}locales${dash}`) > -1) {
        var lang = path.basename(path.dirname(item.path));
        options.widgetFiles.locales[lang] = item.path;
      }
    }


  }).on('end', function () {
    if(isES6) {
      processTranspileJSs();
    } else {
      done(options);
    }
  });
};

OCCProxy.prototype.noCache = function (headerObject) {
  headerObject.headers['cache-control'] = 'no-cache, no-store, must-revalidate';
  headerObject.headers['Pragma'] = 'no-cache';
  headerObject.headers['Expires'] = '0';
};

OCCProxy.prototype.setRoute = function (options) {
  var proxyInstance = this;
  var intercepted = [];

  options = options || {};

  options.callback = options.callback || function () {};

  var activeLogs = typeof options.logs !== 'undefined' ? options.logs : true;

  //Don't duplicate the request, so, don't attach another
  //listener to the same request
  if(proxyInstance.requests.indexOf(options.url) > -1 && !options.duplicate) {
    return;
  }

  //Store the current request url in order to not duplicate
  //that request
  proxyInstance.requests.push(options.url);

  options.phase = options.phase || 'response';
  options.hostname = options.hostname || proxyInstance.env.baseUrl;

  if(options.type === 'json') {
    options.as = 'json';
  }

  if(options.type === 'html') {
    options.as = 'string';
    options.contentType = /text\/html/i;
  }

  if(options.serveFile) {
    options.replaceFilePath = options.serveFile;
  }

  if(options.type === 'replace' && !options.replaceFilePath) {
    winston.error('You should pass the replaceFilePath param to the setRoute when using replace type');
    return;
  }

  if(options.type === 'replace') {
    options.as = 'string';
  }

  //It avoid the problem of not having the file updated
  options.disableHeaderCache = typeof options.disableHeaderCache !== 'undefined' ? options.disableHeaderCache : true;

  var routeLog = '[' + options.phase + '] Setting a route to ' + options.url + (options.replaceFilePath ? ' and expects to have that file replaced by ' + options.replaceFilePath : '');

  //Log which url we're listening to
  proxyInstance.log(routeLog, null, activeLogs);

  //Set a listener to this route
  proxyInstance.proxyServer.intercept(options, function(req, resp, cycle) {
    if (typeof options.skip === 'function' && options.skip()) {
      proxyInstance.log('skipping request ' + req.url + '...');
      return;
    }

    if(proxyInstance.pauseRule) {
      if(proxyInstance.pauseRule.test(req.url) || (req.headers.referer && proxyInstance.pauseRule.test(req.headers.referer))) {
        proxyInstance.pauseProxy(req.url);
      } else {
        proxyInstance.resumeProxy();
      }
    }

    //If the referer is different than paused rule
    //resume the proxy
    if(req.headers.referer && proxyInstance.isProxyPaused()) {
      if(!proxyInstance.pauseRule.test(req.headers.referer)) {
        proxyInstance.resumeProxy();
      }
    }

    if(proxyInstance.isProxyPaused()) {
      return;
    }

    //If the current request ins't for caching purpose, add it to the ignored caching list
    if(!options.proxyCaching && proxyInstance.ignoredProxyCaching.indexOf(req.url) < 0) {
      proxyInstance.ignoredProxyCaching.push(req.url);
    }

    //If it's trying to duplicate the request using a cached request, stop it.
    if(options.proxyCaching && proxyInstance.ignoredProxyCaching.indexOf(req.url) > -1) {
      return;
    }

    //Only process the request if it has a success code
    if(options.onlySuccessCode && !proxyInstance.isSuccessCode(resp.statusCode)) {
      return;
    }

    //Fixing the problem about HPE_UNEXPECTED_CONTENT_LENGTH
    //REF: https://stackoverflow.com/questions/35525715/http-get-parse-error-code-hpe-unexpected-content-length
    if(resp.headers['transfer-encoding']) {
      delete resp.headers['transfer-encoding'];
    }

    // Adding OCC-TOOLS Version to the header
    resp.headers['occ-tools-proxy'] = config.occToolsVersion;

    //No cache
    if(options.disableHeaderCache) {
      proxyInstance.noCache(options.phase === 'response' ? resp : req);
    }

    //Run only once
    if(options.runOncePerRequest && intercepted.indexOf(req.url) > -1) {
      return;
    }

    if(intercepted.indexOf(req.url) === -1) {
      intercepted.push(req.url);
    }

    if(options.type === 'replace') {
      var replaceFile = options.replaceFilePath;

      proxyInstance.log('[' + options.phase + '] replacing the remote file ' + req.url + ' by ' + replaceFile, null, activeLogs);

      try {
        resp.string = fs.readFileSync(replaceFile);
      } catch(error) {
        winston.error(error);
        resp.string = '';
      }

      return options.callback(replaceFile, req, resp, cycle);
    } else if(options.type === 'html') {
      /**
       * We are loading manually with cheerio because Hoxy doesn't set the decodeEntities
       */
      var $ = cheerio.load(resp.string, { decodeEntities: false });

      proxyInstance.log('[' + options.phase + '] opening a session to edit the remote html placed at ' + req.url, null, activeLogs);
      options.callback.call(proxyInstance, $, req, resp, cycle);

      //Returning the changed html
      resp.string = $.html();
    } else if(options.type === 'json') {
      proxyInstance.log('[' + options.phase + '] opening a session to edit the remote json placed at ' + req.url, null, activeLogs);
      return options.callback.call(proxyInstance, resp.json, req, resp, cycle);
    } else {
      proxyInstance.log('[' + options.phase + '] opening a session to edit the remote file placed at ' + req.url, null, activeLogs);
      return options.callback.call(proxyInstance, req, resp, cycle);
    }
  });
};

OCCProxy.prototype.isSuccessCode = function (code) {
  return code >= 200 && code < 300 || code === 304;
};

module.exports = OCCProxy;
