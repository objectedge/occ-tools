'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var path = require('path');
var fs = require('fs-extra');
var async = require('async');
var glob = require('glob');
var winston = require('winston');

var appConfig = require('../config');
var Compiler = require('./compiler');

function Bundler(options) {
  var self = this;

  EventEmitter.call(self);

  self.compiler = new Compiler(options);
  self.options = options || {};
}

util.inherits(Bundler, EventEmitter);

function loadWidgets(options, done) {
  var basePath = path.join(appConfig.dir.project_root, 'widgets/*/*');
  var widgetsList = [];
  var widgetsByOptions = options.widgets ? options.widgets.split(',') : false;

  glob(basePath)
    .on('match', function (widgetPath) {
      try {
        var widgetConfig = fs.readJsonSync(path.join(widgetPath, 'widget.json'));
        var widgetMeta = fs.readJsonSync(path.join(widgetPath, 'widgetMeta.json'));
        var widgetName = widgetConfig.widgetType || path.basename(widgetPath);

        if(widgetMeta.ES6) {
          var baseEntryPath = path.join(widgetPath, options.source);

          try {
            fs.accessSync(baseEntryPath + '-src', fs.F_OK);
            baseEntryPath = baseEntryPath + '-src';
          } catch (e) {
            winston.debug(e);
          }

          var destinationDir = path.join(widgetPath, options.dest);

          //Transpile only the widgets passed as option
          if(widgetsByOptions && widgetsByOptions.indexOf(widgetName) < 0) {
            return;
          }

          widgetsList.push({
            name: widgetName,
            basePath: widgetPath,
            baseEntryPath: baseEntryPath,
            entryPath: path.join(baseEntryPath, 'index'),
            destinationDir: destinationDir,
            compiledFileName: path.join(destinationDir, options.compiledFileName || widgetName + '.js')
          });
        }
      } catch(err) {
        winston.debug(err);
      }
    })
    .on('end', function () {
      done(widgetsList);
    });
}

Bundler.prototype.compile = function(options) {
  var self = this;
  options = options || self.options;

  loadWidgets(options, function (widgetsList) {
    options.widgetsList = widgetsList;

    async.waterfall([
      function(next) {
        self.compiler.setConfigs(options, next);
      },
      function(configs, next) {
        self.compiler.defineCompiler(next);
      },
      function(bundlerConfigs, next) {
        if(options.watch) {
          self.compiler.watch({
            aggregateTimeout: 300,
            poll: typeof options.polling === 'undefined' ? true : options.polling
          }, next);
          return;
        }

        self.compiler.run(next);
      },
      function(bundlerStats) {
        self.emit('complete', bundlerStats);
      }
    ], function(error) {
      if(error) {
        self.emit('error', error);
      }
    });
  });
};

module.exports = Bundler;
