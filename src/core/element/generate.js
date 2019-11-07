'use strict';

var path = require('path');
var fs = require('fs-extra');
var winston = require('winston');
var github = require('../github');

var _remoteRootFolder = {
  template: 'samples/element/layouts/oeGenericWidgetDefaultLayout',
  es5: 'samples/element/oeGenericElement'
};

var _remotElementId = {
  template: /oeGenericTemplateRegion/g,
  es5: /OE Generic Element|oeGenericElement/g
};

function getElementFilePath(elementName, options, fileMeta, remoteRootFolder, remoteElementID) {
  var localRootFolder, replacedRemoteFilePath;

  var remoteElementIDRegExp = remoteElementID instanceof RegExp ? remoteElementID : new RegExp(remoteElementID, 'g');

  if (options.widget) {
    localRootFolder = path.join('widgets/objectedge', options.widget);
    replacedRemoteFilePath = fileMeta.path.replace(remoteElementIDRegExp, options.widget + '/element/' + elementName);
  } else {
    localRootFolder = path.join('elements', elementName);
    replacedRemoteFilePath = fileMeta.path.replace(remoteElementIDRegExp, elementName);
  }

  var remoteFolder = path.relative(remoteRootFolder, replacedRemoteFilePath);

  return path.join(localRootFolder, remoteFolder);
}

function replaceRemoteID(fileMeta, localID, remoteID) {
  return new Buffer(fileMeta.content, 'base64').toString().replace(remoteID, localID);
}

function setElementGlobalOption(fileContent, fileMeta, options) {
  var elementDescriptor = JSON.parse(fileContent);

  if (options.widget) {
    elementDescriptor.supportedWidgetType = [options.widget];
  } else {
    elementDescriptor.global = true;
    elementDescriptor.supportedWidgetType = [''];
  }

  return fileContent = JSON.stringify(elementDescriptor, null, 2);
}

function createLayoutFile(elementName, options) {
  var type = options.es6 ? 'es6' : 'es5';
  var templateFile = 'widgets/objectedge/' + options.widget + '/layouts/' + options.widget + 'DefaultLayout/widget.template';
  var layoutPath = 'widgets/objectedge/' + options.widget + '/layouts/' + options.widget + 'DefaultLayout';

  try {
    fs.accessSync(templateFile, fs.F_OK);
  } catch (e) {
    winston.debug('widget.template file doesn\'t exist. Will create: "%s"...', templateFile);
    fs.ensureDir(layoutPath, function(error) {
      if (error) {
        winston.error('Error creating widget.template: "%s"', error);
      }

      github.list({
        repo: 'occ-components',
        remotePath: _remoteRootFolder.template,
        each: function (err, fileMeta, callback) {
          if(err)  {
            callback(err, null);
            winston.error('Error: "%s"', err);
            return;
          }

          var fileContent = replaceRemoteID(fileMeta, elementName, _remotElementId[type]);
          fileContent = fileContent.toString().replace(_remotElementId.template, options.widget + 'TemplateRegion');

          winston.debug('Creating file "%s"...', fileMeta.name);
          fs.outputFile(templateFile, fileContent, callback);
        }
      });
    });
  }
}

function generateElementFromDefault(elementDescription, elementName, options, callback) {
  var type = options.es6 ? 'es6' : 'es5';

  github.list({
    repo: 'occ-components',
    remotePath: _remoteRootFolder[type],
    each: function (err, fileMeta, callback) {
      if(err)  {
        callback(err, null);
        return;
      }

      var filePath = getElementFilePath(elementName, options, fileMeta, _remoteRootFolder[type], _remotElementId[type]);
      var fileContent = replaceRemoteID(fileMeta, elementName, _remotElementId[type]);

      if (fileMeta.name === 'element.json') {
        fileContent = setElementGlobalOption(fileContent, fileMeta, options);
      }

      winston.debug('Creating file "%s"...', fileMeta.name);
      fs.outputFile(filePath, fileContent, callback);
    }
  }, callback);

  if (options.widget) {
    createLayoutFile(elementName, options);
  }
}

module.exports = function (elementName, options, callback) {
  winston.info('Generating element "%s"...', elementName);
  var elementDescription = elementName;

  generateElementFromDefault(elementDescription, elementName, options, callback);
};
