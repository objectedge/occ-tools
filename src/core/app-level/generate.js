'use strict';

var path = require('path');
var fs = require('fs-extra');
var winston = require('winston');
var request = require('request');
var util = require('util');

var github = require('../github');
var _config = require('../config');

function generateAppLevelFromURL(name, options, callback) {

  winston.info('Downloading file from URL: %s', options.url);
  request(options.url).on('response',  function (response) {
    if (response.statusCode < 400){
      var file = name ? 
        util.format('%s.js', name) : 
        options.url.substring(options.url.lastIndexOf('/')+1);
      var filePath = path.join(_config.dir.project_root, options.dir, file);
      winston.info(util.format('Storing file at %s', filePath));
      var stream = fs.createWriteStream(filePath).on('finish', callback);
      response.pipe(stream);
    } else{
      callback(util.format('Error downloading the file [%s]', response.statusMessage));
    }
  }).on('error', function(error){ callback(error) });
}

function generateAppLevelFromTemplate(name, options, callback) {
  var foundTemplate = false;      
  var fileName = util.format('%s.js', name);
  github.list({
    repo: 'occ-components',
    remotePath: 'samples/app-level/template',
    each: function (error, metadata, callback) {
      if(error)  {
        callback(error, null);
        return;
      }

      var template = util.format('%s.js', options.template);
      if (metadata.name === template) {
        foundTemplate = true;
        var filePath = path.join(_config.dir.project_root, options.dir, fileName);
        var content = new Buffer(metadata.content, 'base64').toString();
        content = content.replace(/__NAME__/g, name);
  
        winston.debug('Creating file "%s"...', fileName);
        fs.outputFile(filePath, content, callback);
      } else {
        callback();
      }
    }
  }, function(error){
    if (error) callback(error);
    if (!foundTemplate) callback(util.format('Template %s not found',  options.template));

    callback();
  });
}

function generateAppLevelFromComponents(name, options, callback) {
  var remotePath = options.fromComponents.substring(0, options.fromComponents.lastIndexOf('/'));
  var remotefileName = options.fromComponents.substring(options.fromComponents.lastIndexOf('/')+1);
  var fileName = name ? util.format('%s.js', name) : remotefileName;
  var foundFile =  false;
  github.list({
    repo: 'occ-components',
    remotePath: remotePath,
    each: function (error, metadata, callback) {
      if(error)  {
        callback(error, null);
        return;
      }

      if(metadata.name === remotefileName){
        foundFile = true;
        var filePath = path.join(_config.dir.project_root, options.dir, fileName);
        var content = new Buffer(metadata.content, 'base64').toString();
      
        winston.debug('Creating file "%s"...', fileName);
        fs.outputFile(filePath, content, callback);
      } else {
        callback();
      }
    }
  }, function(error){
    if (error) callback(error);
    if (!foundFile) callback(util.format('Template %s not found',  options.template));

    callback();
  });
}

module.exports = function (name, options, callback) {
  winston.info('Generating app-level "%s"...', name);

  if (options.fromComponents){
    generateAppLevelFromComponents(name, options, callback);
  } else if (options.url){
    generateAppLevelFromURL(name, options, callback);
  } else {
    generateAppLevelFromTemplate(name, options, callback);  
  }
};
