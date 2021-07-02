/**
 * Native dependencies
 */
var path = require('path');
var walk = require('walkdir');

/**
 * Application dependencies
 */
var less = require('less');
var exec = require('child_process').exec;
var winston = require('winston');

/**
 * Proxy dependencies
 */
var config = require('../config');

/**
 * Configurations
 */

//Theme
var themeID = config.theme.id;
var themeName = config.theme.name;
var themePath = path.join(config.dir.project_root, 'themes', themeName + '_' + themeID);

//OCC Tools
var widgetsNames = [];

/**
 *
 * Replace the remote less by the local one
 *
 */
function replaceLESS(done, options) {
  var proxyInstance = this;
  var widgetCSS = '';
  options = options || {};

  var processImports = function () {
    //Merge them into one import
    importFiles = importFiles.join('\n');

    //Set less options
    var lessOptions = {
      paths : paths,
      dumpLineNumbers: 'comments'
    };

    //Render all imports
    less.render(importFiles, lessOptions, function (error, output) {
      if(error) {
        winston.error(error);
        done(error, output);
        return;
      }

      //Get only the widgets less
      var proxyLESSContent = output.css.split('/**OCC-PROXY-LESS**/');

      //Remove the first result
      proxyLESSContent.shift();

      //Merge them and set a done callback
      widgetCSS = proxyLESSContent.join('\n');
      done(null, widgetCSS);
    });
  };

  widgetsNames = [];

  var paths = [__dirname + '/less/', themePath + '/', path.join(config.dir.project_root, 'widgets/objectedge/'), path.join(config.dir.project_root, 'widgets/objectedge/')];
  var importFiles = [];

  //Add bootstrap and theme variables
  importFiles.push('@import "bootstrap/bootstrap.less";');

  if(!options.renderTheme) {
    importFiles.push('@import "variables.less";');
    importFiles.push('@import "styles.less";');
    importFiles.push('@import "additionalStyles.less";');

    //Adding a specific context to proxy
    importFiles.push('/**OCC-PROXY-LESS**/ \n.occpc {\n');
  }

  //Push each file widget less to import
  forEach(proxyInstance.widgetsList, function (widget) {
    if(!widget.active) {
      return;
    }

    widgetsNames.push(widget.widgetName);
    importFiles.push('@import "' + widget.widgetName + '/less/widget.less";');
  });

  if(!options.renderTheme) {
    //Closing the specific context to proxy bracket
    importFiles.push('}\n');
  }

  //Styleguide support
  if(options.renderTheme) {
    var eachThemeFile = function (item) {
      importFiles.push('/**OCC-PROXY-LESS**/' + '@import "' + item.path + '";');
    };

    walkThemeDir(path.join(config.dir.project_root, 'less'), eachThemeFile, processImports);
    return;
  }

  processImports();
}

/**
 *
 * native forEach has some performance issues, so we have the old one
 * when we need more performance.
 *
 * In that simple benchmark, we can see the difference between then:
 *
 * | forEach using native method x 2,889,057 ops/sec ±1.13% (74 runs sampled) |
 * | forEach using while x 4,661,562 ops/sec ±1.32% (58 runs sampled)         |
 * | forEach using for x 5,631,097 ops/sec ±4.64% (64 runs sampled)           |
 * | Fastest is forEach using for                                             |
 *
 */
function forEach(array, callback) {
  var index = 0;
  var arrayLength = array.length;

  for(; index < arrayLength; index++) {
    callback(array[index], index);
  }
}

function walkThemeDir(themeDir, eachFile, done) {
  var allItems = [];

  walk(themeDir).on('file', function (item, stats) {
    if(/\.less/.test(item)) {
      eachFile({ path: item, stats:  stats});
      allItems.push(item);
    }
  }).on('end', function () {
    done(allItems);
  });
}

function runHologram(done) {
  var proxyInstance = this;
  var child = exec('hologram -c ' + path.join(config.dir.project_root, 'hologram_config.yml'), { encoding: 'utf8' });

  child.stdout.on('data', function(data) {
    proxyInstance.proxyServer.log('HOLOGRAM:');
    proxyInstance.proxyServer.log(data);
  });

  child.stderr.on('data', function(data) {
    proxyInstance.proxyServer.log('HOLOGRAM ERROR:' + data);
  });

  child.on('close', function () {
    proxyInstance.proxyServer.log('HOLOGRAM: Done');
    done();
  });
};

module.exports = {
  replaceLESS: replaceLESS,
  forEach: forEach,
  walkThemeDir: walkThemeDir,
  runHologram: runHologram
};
