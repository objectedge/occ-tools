'use strict';

var path = require('path');
var fs = require('fs-extra');
var winston = require('winston');
var github = require('../github');
var _config = require('../config');

function getSiteSettingsFilePath(name, options, metadata, remoteRootFolder) {
  
  var localRootFolder = path.join('settings', 'config', name);
  var replacedRemoteFilePath = metadata.path.replace(/template/g, name);

  var remoteFolder = path.relative(remoteRootFolder, replacedRemoteFilePath);

  return path.join(_config.dir.project_root, localRootFolder, remoteFolder);
}

function generateSiteSettingsFromDefault(name, options, callback) {
  var remoteSettingsPath = 'samples/site-settings/template';      
  github.list({
    repo: 'occ-components',
    remotePath: remoteSettingsPath,
    each: function (error, metadata, callback) {
      if(error)  {
        callback(error, null);
        return;
      }

      var filePath = getSiteSettingsFilePath(name, options, metadata, remoteSettingsPath);

      var fileContent = new Buffer(metadata.content, 'base64').toString();
      fileContent = fileContent.replace(/__TITLE__/g, name);

      winston.info('Creating file "%s"...', metadata.name);
      fs.outputFile(filePath, fileContent, callback);
    }
  }, callback);
}

module.exports = function (name, options, callback) {
  winston.info('Generating site settings "%s"...', name);

  generateSiteSettingsFromDefault(name, options, callback);
};
