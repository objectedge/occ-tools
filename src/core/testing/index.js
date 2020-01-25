'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var path = require('path');
var fs = require('fs-extra');
var walk = require('walkdir');
var async = require('async');
var exec = require('child_process').exec;
var appConfig = require('../config');

function Testing(options) {
  var self = this;

  EventEmitter.call(self);
  self.options = options || {};
  self.options.currentEnv = appConfig.environment.details;
}

util.inherits(Testing, EventEmitter);

/**
 * Check if the file or directory exists
 * @param  {String} widgetPath path to be verified
 * @return {Boolean} return true if the file exists and false if it doesn't
 */
Testing.prototype.doesItExist= function (widgetPath) {
  try {
    fs.accessSync(widgetPath, fs.F_OK);
    return true;
  } catch (e) {
    return false;
  }
};

Testing.prototype.run = function(options) {
  var self = this;
  var options = options || self.options;
  var currentEnv = options.currentEnv;

  if(!options.widgetName) {
    self.emit('error', 'Please provide a valid widget name using the param --widgetName');
    return;
  }

  var specsPath = path.join(appConfig.dir.project_root, options.target, options.widgetName, 'specs');
  self.options.specsPath = specsPath;

  if(!this.doesItExist(specsPath)) {
    self.emit('error', 'Please create a folder Specs inside of your widget path and put there all specs');
    return;
  }

  var configsPath = path.join(specsPath, 'config.json');

  if(!this.doesItExist(configsPath)) {
    self.emit('error', 'Please create a config file at ' + specsPath + ' called config.json');
    return;
  }

  var specFiles = [];

  var runTestings = function () {
    if(!specFiles.length) {
      self.emit('error', 'It wasn\'t able to find any spec file at ' + specsPath + ' exiting..');
      return;
    }

    var configs = fs.readJsonSync(configsPath);

    if(Object.prototype.toString.call(configs.pages) !== '[object Array]') {
      self.emit('error', 'Please set at least one page on config.json');
      return;
    }

    if(Object.prototype.toString.call(configs.viewports) !== '[object Array]') {
      self.emit('error', 'Please set at least one viewport on config.json');
      return;
    }



    return;

    //
    // var casperOptions = [
    //   'test',
    //
    //   '--baseUrl="' + currentEnv.base_url + '"',
    //   '--username="' + currentEnv.username + '"',
    //   '--password="' + currentEnv.password + '"',
    //   '--widgetName="' + options.widgetName + '"',
    //   '--widgetSettings="' + configsPath + '"',
    //   '--specFiles=' + specFiles,
    //
    //   path.join(__dirname, 'default.js')
    // ].join(' ');
    //
    // var child = exec('casperjs ' + casperOptions, { encoding: 'utf8' });
    //
    // child.stdout.on('data', function(data) {
    //   console.log(data);
    // });
    //
    // child.stderr.on('data', function(data) {
    //   console.log(data);
    // });
    //
    // child.on('close', function () {
    //   self.emit('complete', true);
    // });
  };

  walk(specsPath).on('file', function (item) {
    if(item.indexOf('config.json') < 0) {
      specFiles.push(item);
    }
  }).on('end', runTestings);
};

module.exports = Testing;
