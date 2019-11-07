'use strict';

var path = require('path');
var fs = require('fs-extra');
var async = require('async');
var winston = require('winston');

var github = require('../github');
var _config = require('../config');
var generateWidgetFromOcc = require('./generateFromOcc');

var occComponentsWidgets = {
  local: path.join(_config.dir.project_root, '.occ-components', 'widgets'),
  remote: 'src'
};

var _remoteRootFolder = {
  es5: 'samples/widget-generic/oeGenericWidget',
  es6: 'samples/widget-generic/oeES6WidgetNew'
};

var _remoteWidgetId = {
  es5: /oeGenericWidget/g,
  es6: /oeES6WidgetNew/g
};

var _remoteWidgetName = {
  es5: /OE Generic Widget/g,
  es6: /OE ES6 Widget/g
};

function replaceBaseViewModel(fileContent, fileBaseContent, fileMeta, widgetName, baseName) {
  var baseViewModelName = (fileBaseContent.match(/^export.+?class\s(.+?)\sextends\s.*?{/m))[1];
  var viewModelName = (fileContent.match(/^export.+?class\s(.+?)\s?extends\s.*?{/m))[1];
  var parentViewModelName = baseViewModelName + 'Parent';
  var imports = "import { " + baseViewModelName + " as " + parentViewModelName + " } from 'occ-components/" + baseName + "/view-models';";

  //remove all models
  fileContent = fileContent.replace(/.+?SampleModel\sfrom\s.+?;/m, '//Add your models here');

  //Replace the baseWidget
  fileContent = fileContent.replace(/.+?BaseWidget\s}\sfrom\s.+?;/m, imports);

  //Extend the parent view model
  fileContent = fileContent.replace(/^(export.+?class)\s.+?\s?{/m, '$1 ' + baseViewModelName + ' extends ' + parentViewModelName + ' {');

  //instantiate parent
  if(!/super\(\)/g.test(fileContent)) {
    fileContent = fileContent.replace(/(constructor.+?{\n)/g, '$1   super();');
  }

  return fileContent;
}

function replaceBaseModel(fileContent, fileBaseContent, fileMeta, widgetName, baseName) {
  var baseModelName = (fileBaseContent.match(/^export.+?default\sclass\s(.+?)\s?{/m))[1];

  //Replacing model name
  fileContent = fileContent.replace(/(^export.+?class)\s.+?{$/m, '$1 ' + baseModelName + ' {');

  return fileContent;
}

function getWidgetFilePath(widgetName, fileMeta, remoteRootFolder, remoteWidgetID, target) {
  var localRootFolder = path.join(_config.dir.project_root, target, widgetName);
  var remoteWidgetIDRegExp = remoteWidgetID instanceof RegExp ? remoteWidgetID : new RegExp(remoteWidgetID, 'g');
  var replacedRemoteFilePath = fileMeta.path.replace(remoteWidgetIDRegExp, widgetName);
  var remoteFolder = path.relative(remoteRootFolder, replacedRemoteFilePath);

  return path.join(localRootFolder, remoteFolder);
}

function replaceWidgetID(type, fileMeta, widgetName, remoteWidgetID, widgetDescription) {
  return new Buffer(fileMeta.content, 'base64').toString().replace(remoteWidgetID, widgetName);
}

function setWidgetGlobalOption(fileContent, fileMeta, options) {
  if (options.global && fileMeta.name === 'widget.json') {
    var widgetDescriptor = JSON.parse(fileContent);
    widgetDescriptor.global = options.global;
    fileContent = JSON.stringify(widgetDescriptor, null, 2);
  }
  return fileContent;
}

function generateWidgetFromDefault(widgetDescription, widgetName, options, callback) {
  var localRootFolder = path.join(_config.dir.project_root, options.target, widgetName);
  var type = options.es6 ? 'es6' : 'es5';

  github.list({
    repo: 'occ-components',
    remotePath: _remoteRootFolder[type],
    each: function (err, fileMeta, callback) {
      if(err)  {
        callback(err, null);
        return;
      }

      var filePath = getWidgetFilePath(widgetName, fileMeta, _remoteRootFolder[type], _remoteWidgetId[type], options.target);
      var fileContent = replaceWidgetID(type, fileMeta, widgetName, _remoteWidgetId[type], widgetDescription);

      fileContent = setWidgetGlobalOption(fileContent, fileMeta, options);

      winston.info('Creating file "%s"...', fileMeta.name);
      fs.outputFile(filePath, fileContent, callback);
    }
  }, callback);
}

function generateWidgetFromBase(widgetDescription, widgetName, options, callback) {
  var occComponentsWidgetPath = path.join(occComponentsWidgets.local, options.base);
  var remoteJSWidgetPath = path.join(occComponentsWidgets.remote, options.target, options.base);
  var viewModelTemplate = '';
  var modelTemplate = '';
  var viewModelRegex = /\/(js|js-src)\/view-models\/sample\.js/;
  var modelRegex = /\/(js|js-src)\/models\/sample\.js/;

  var getViewModelTemplate = function (callback) {
    github.list({
      repo: 'occ-components',
      remotePath: _remoteRootFolder.es6,
      each: function (err, fileMeta, callback) {
        if(err)  {
          callback(err, null);
          return;
        }

        var fileContent = new Buffer(fileMeta.content, 'base64').toString();

        if(viewModelRegex.test(fileMeta.path)) {
          viewModelTemplate = fileContent;
        }

        if(modelRegex.test(fileMeta.path)) {
          modelTemplate = fileContent;
        }

        callback();
      }
    }, callback);
  };

  var processEachWidgetFile = function (err, fileMeta, callback) {
    if(err)  {
      callback(err, null);
      return;
    }

    var baseFilePath = path.join(occComponentsWidgetPath, path.relative(remoteJSWidgetPath, fileMeta.path)).replace('/js', '').replace('js-src', '');
    var widgetFilePath = getWidgetFilePath(widgetName, fileMeta, remoteJSWidgetPath, options.base, options.target);
    var fileContent = replaceWidgetID('es6', fileMeta, widgetName, new RegExp(options.base, 'g'), widgetDescription);

    fileContent = setWidgetGlobalOption(fileContent, fileMeta, options);

    winston.info('Downloading the base widget file "%s"...', fileMeta.name);

    /**
     * Creates the js file and its source map
     */
    var createJSFileAndMap = function () {
      var widgetJSFile = widgetName + '.js';
      var widgetJSFileMap = widgetName + '.js.map';
      var transpiledWidgetPath = path.join(_config.dir.project_root, '.occ-transpiled', 'widgets', widgetName)

      widgetFilePath = path.join(transpiledWidgetPath, widgetJSFile);
      winston.info('Creating widget js file "%s"... at %s ', widgetJSFile, widgetFilePath);
      fs.outputFile(widgetFilePath, '//auto-generated', callback);

      widgetFilePath = path.join(transpiledWidgetPath, widgetJSFileMap);
      winston.info('Creating widget js file map "%s"... at %s ', widgetJSFileMap, widgetFilePath);
      fs.outputFile(widgetFilePath, '//auto-generated', callback);
    };

    /**
     * TODO:
     *
     * The base widget feature is not working anymore.
     *
     * Take a look at that because the path has been changed from /js-src to /js
     * and we don't have a transpile file at /js, it's placed at .occ-transpiled instead of js
     *
     */

    // /**
    //  * If it's in the js path, copy the occ-components file to .occ-components
    //  * and do all needed replaces for viewModels and models
    //  */
    // if(/\/js\//.test(fileMeta.path)) {
    //   //Copying the base to .occ-components
    //   winston.info('Copying the base widget file "%s"... to %s ', fileMeta.name, baseFilePath);

    //   fs.outputFile(baseFilePath, fileContent, function (err) {
    //     if(err) {
    //       callback(err, null);
    //       return;
    //     }

    //     if(!/index\.js/.test(fileMeta.path)) {
    //       //Generating the widget file from base
    //       if(/\/view-models/.test(fileMeta.path)) {
    //         fileContent = replaceBaseViewModel(viewModelTemplate, fileContent, fileMeta, widgetName, options.base);
    //       }

    //       if(/\/models/.test(fileMeta.path)) {
    //         fileContent = replaceBaseModel(modelTemplate, fileContent, fileMeta, widgetName, options.base);
    //       }
    //     }

    //     //Save widget file into the target dir
    //     fs.outputFile(widgetFilePath, fileContent, callback);
    //   });
    // } else if(/\/js\//.test(fileMeta.path)) {
    //   createJSFileAndMap();
    // } else {
      winston.info('Creating widget file "%s"... at %s ', fileMeta.name, widgetFilePath);
      fs.outputFile(widgetFilePath, fileContent, callback);
    // }
  };

  /**
   * Get templates, remove the local components and process each widget
   */
  async.waterfall([
    function (callback) {
      getViewModelTemplate(callback);
    },
    function (filesList, callback) {
      fs.remove(occComponentsWidgetPath, callback);
    }
  ], function (err) {
    if(err && err.code === 404) {
      callback('Widget "' + options.base + '" hasn\'t been found in the remote path: ' + remoteJSWidgetPath);
      return;
    }

    github.list({
      repo: 'occ-components',
      remotePath: remoteJSWidgetPath,
      each: processEachWidgetFile
    }, callback);
  });
}

module.exports = function (widgetName, options, callback) {
  winston.info('Generating widget "%s"...', widgetName);
  var widgetDescription = options.description || widgetName; // Will use the widget name if description is not defined

  //Using es6 and base
  if(options.es6 && options.base) {
    generateWidgetFromBase(widgetDescription, widgetName, options, callback);
    return;
  }

  //Using es6 and base
  if(options.fromOcc) {
    generateWidgetFromOcc(this._occ, widgetName, options, callback);
    return;
  }

  generateWidgetFromDefault(widgetDescription, widgetName, options, callback);
};
