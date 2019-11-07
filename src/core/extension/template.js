'use strict';

var path = require('path');
var fs = require('fs-extra');
var async = require('async');
var winston = require('winston');

var templateId = 'extension_descriptor';
var templateFile = path.join(__dirname, 'templates', templateId);

/**
 * Generate the timestamp to put in extension descriptor.
 * @param  {Function} callback The fn to be executed after generation.
 */
function getDateTime(datetime, callback) {
  var date = new Date();
  var hour = date.getHours();

  hour = (hour < 10 ? '0' : '') + hour;
  var min  = date.getMinutes();
  min = (min < 10 ? '0' : '') + min;
  var sec  = date.getSeconds();
  sec = (sec < 10 ? '0' : '') + sec;

  var year = date.getFullYear();
  var month = date.getMonth() + 1;
  month = (month < 10 ? '0' : '') + month;
  var day  = date.getDate();
  day = (day < 10 ? '0' : '') + day;

  var time = ' ' + hour + ':' + min + ':' + sec;

  if(!datetime) {
    time = '';
  }

  return callback(null, year + '-' + month + '-' + day + time);
}

/**
 * Get the extension template from file.
 * @param  {String}   dateTime The generation timestamp.
 * @param  {Function} callback The fn to be executed after generation.
 */
function getTemplateFile(dateTime, callback) {
  fs.exists(templateFile, function(exists) {
    if (exists) {
      fs.readFile(templateFile, function(err, data) {
        return err ? callback(err) : callback(null, dateTime, data.toString());
      });
    } else {
      winston.warn('Template %s not found.', templateId);
      return callback(null, '', '');
    }
  });
}

module.exports = function(extId, name, datetime, callback) {
  async.waterfall([
    getDateTime.bind(null, datetime),
    getTemplateFile,
    function(dateTime, templateFile, callback) {
      return callback(null, templateFile.replace(/EXT_ID/g, extId).replace(/DATE/g, dateTime).replace(/EXT_NAME/g, name));
    }
  ], callback);
};