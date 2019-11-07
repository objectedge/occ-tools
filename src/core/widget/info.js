'use strict';

var util = require('util');
var winston = require('winston');
var async = require('async');

/**
 * Filter widgets info by id.
 * @param  {Object} widgetInfo The widget info.
 */
function filterById(widgetInfo) {
  return widgetInfo.item.widgetType == this;
}

/**
 * Get all widgets info from specifc folder
 * @param  {Array}    widgetsInfo The widgets info resultList.
 * @param  {Object}   folder      The folder to query.
 * @param  {Function} callback    The callback fn.
 */
function getFolderInfo(widgetsInfo, folder, callback) {
  winston.info('Fetching widgets info from %s folder...', folder);
  var infoUrl = util.format('widgetDescriptors/instances?source=%s', this._settings.folders[folder].source);
  this._occ.request(infoUrl, function(err, data) {
    if (err) return callback(err);
    if (!data || typeof data.items === 'undefined') {
      winston.warn('Undefined response for folder %s', folder);
    } else {
      data.items.forEach(function(item) {
        widgetsInfo.push({ folder: folder, item: item });
      });
    }
    return callback();
  });
}

module.exports = function(widgetId, callback) {
  var self = this;
  var widgetsInfo = [];
  var gfi = function(folder, callback) {
    getFolderInfo.call(self, widgetsInfo, folder, callback);
  };

  async.each(Object.keys(self._settings.folders), gfi, function(err) {
    return err ? callback(err) : callback(null, widgetId ? widgetsInfo.filter(filterById.bind(widgetId)) : widgetsInfo);
  });
};