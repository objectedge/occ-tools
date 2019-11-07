'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs-extra');
var async = require('async');
var request = require('request');
var winston = require('winston');
var _configs = require('../config');
var widgetsInfo = require('./info');

/**
 * Download the widget template file.
 * @param  {Object}   widgetInfo The widget info received from OCC.
 * @param  {Function} callback   The fn to be executed after download.
 */
function downloadTemplate(widgetInfo, settings, callback) {
  var self = this;

  winston.info('Downloading template for %s...', widgetInfo.item.widgetType);
  var describeCodePath = util.format('widgets/%s/code', widgetInfo.item.instances[0].id);
  self._occ.request(describeCodePath, function(err, file) {
    if (err) return callback(err);

    var templateDir;
    if (settings && settings.dest) {
      templateDir = path.join(_configs.dir.project_root, 'widgets', settings.dest, widgetInfo.item.widgetType, 'templates');
    } else {
      templateDir = path.join(_configs.dir.project_root, 'widgets', widgetInfo.folder, widgetInfo.item.widgetType, 'templates');
    }
    winston.debug('Writing %s template in %s', widgetInfo.item.widgetType, templateDir);
    var templateFilePath = path.join(templateDir, 'display.template');
    fs.outputFile(templateFilePath, file.source, callback);
  });
}

/**
 * Download the widget LESS file.
 * @param  {Object}   widgetInfo The widget info received from OCC.
 * @param  {Function} callback   The fn to be executed after download.
 */
function downloadLess(widgetInfo, settings, callback) {
  var self = this;
  winston.info('Downloading LESS for %s...', widgetInfo.item.widgetType);
  var describeLessPath = util.format('widgets/%s/less', widgetInfo.item.instances[0].id);
  self._occ.request(describeLessPath, function(err, file) {
    if (err) return callback(err);
    var lessDir;
    if (settings && settings.dest) {
      lessDir = path.join(_configs.dir.project_root, 'widgets', settings.dest, widgetInfo.item.widgetType, 'less');
    } else {
      lessDir = path.join(_configs.dir.project_root, 'widgets', widgetInfo.folder, widgetInfo.item.widgetType, 'less');
    }
    winston.debug('Writing %s LESS in %s', widgetInfo.item.widgetType, lessDir);
    var lessFilePath = path.join(lessDir, 'widget.less');
    fs.outputFile(lessFilePath, file.source, callback);
  });
}

/**
 * Download all widget js files.
 * @param  {Object}   widgetInfo The widget info received from OCC.
 * @param  {Function} callback   The fn to be executed after download.
 */
function downloadAllJs(widgetInfo, settings, callback) {
  var self = this;
  winston.info('Downloading %s js files...', widgetInfo.item.widgetType);
  var describeJsPath = util.format('widgetDescriptors/%s/javascript', widgetInfo.item.id);
  self._occ.request(describeJsPath, function(err, data) {
    if (err) return callback(err);
    async.each(data.jsFiles, function(jsFile, callback) {
      async.waterfall([
        function(callback) {
          self._auth.getToken('file', callback);
        },
        function(fileToken, callback) {
          var jar = request.jar();
          var cookie = request.cookie(fileToken);
          jar.setCookie(cookie, jsFile.url);
          request({url: jsFile.url, jar: jar}, function(err, response, body) {
            return err ? callback(err) : callback(null, body);
          });
        },
        function(data, callback) {
          var jsPath;
          if (settings && settings.dest) {
            jsPath = path.join(_configs.dir.project_root, 'widgets', settings.dest, widgetInfo.item.widgetType, 'js');
          } else {
            jsPath = path.join(_configs.dir.project_root, 'widgets', widgetInfo.folder, widgetInfo.item.widgetType, 'js');
          }
          fs.outputFile(path.join(jsPath, jsFile.name), data, callback);
        }
      ], callback);
    }, callback);
  });
}

/**
 * Writes the widget descriptor in widget folder.
 * @param  {Object}   widgetInfo The widget info received from OCC.
 * @param  {Function} callback   The fn to executed after process.
 */
function writeDescriptor(widgetInfo, settings, callback) {
  winston.info('Writing %s widget.json...', widgetInfo.item.widgetType);
  var widgetPath;
  if (settings && settings.dest) {
    widgetPath = path.join(_configs.dir.project_root, 'widgets', settings.dest, widgetInfo.item.widgetType);
  } else {
    widgetPath = path.join(_configs.dir.project_root, 'widgets', widgetInfo.folder, widgetInfo.item.widgetType);
  }
  fs.outputFile(path.join(widgetPath, 'widget.json'), JSON.stringify(widgetInfo.item, null, '  '), callback);
}

/**
 * Download a single widget.
 * @param  {Object}   widgetInfo The widget info received from OCC.
 * @param  {Function} callback   The fn to executed efter download.
 */
function downloadWidget(widgetInfo, settings, callback) {
  var self = this;
  winston.info('Downloading widget %s...', widgetInfo.item.widgetType);
  if (widgetInfo.item.instances.length <= 0) {
    winston.warn('No instances available for widget %s.', widgetInfo.item.widgetType);
    return callback();
  }
  async.parallel([
    function(callback) {
      downloadTemplate.call(self, widgetInfo, settings, callback);
    },
    function(callback) {
      downloadLess.call(self, widgetInfo, settings, callback);
    },
    function(callback) {
      if (widgetInfo.folder === 'oracle') return callback();
      downloadAllJs.call(self, widgetInfo, settings, callback);
    },
    function(callback) {
      writeDescriptor.call(self, widgetInfo, settings, callback);
    }
  ], callback);
}

/**
 * Download the list of widgets passed by argument.
 * @param  {Array}   widgetsInfo The list of widgets info received from OCC.
 * @param  {Function} callback    The fn to be executed after download.
 */
function downloadWidgets(widgetsInfo, settings, callback) {
  var self = this;
  var widgetsCount = widgetsInfo.length;
  var currentCount = 0;
  var dw = function(widgetInfo, callback) {
    winston.info('Widget %d of %d', ++currentCount, widgetsCount);
    downloadWidget.call(self, widgetInfo, settings, callback);
  };

  async.each(widgetsInfo, dw, callback);
}

module.exports = function (widgetId, settings, callback) {
  var self = this;
  var fetchWidgetsInfo = function(callback) {
    widgetsInfo.call(self, widgetId, callback);
  };

  async.waterfall([
    fetchWidgetsInfo.bind(self),
    function (widgetsInfo, callback) {
      downloadWidgets.call(self, widgetsInfo, settings, callback);
    }
  ], callback);
};
