'use strict';

var fs = require('fs');
var util = require('util');
var async = require('async');

function initFileUpload(srcPath, destPath, callback) {
  var opts = {
    api: 'files',
    method: 'put',
    body: {
      filename: destPath,
      segments: 1,
      uploadType: 'general'
    }
  };
  this._occ.request(opts, function(err, data) {
    return callback && callback(err, data && data.token);
  });
}

function doFileUpload(srcPath, destPath, uploadToken, callback) {
  var self = this;
  async.waterfall([
    function(callback) {
      fs.readFile(srcPath, function(err, data) {
        return callback && callback(err, data && new Buffer(data).toString('base64'));
      });
    },
    function(fileContent, callback) {
      self._occ.request({
        api: util.format('files/%s', uploadToken),
        method: 'post',
        body: {
          filename: destPath,
          token: uploadToken,
          index: 0,
          file: fileContent
        }
      }, callback);
    }
  ], callback);
}

module.exports = function(srcPath, destPath, callback) {
  async.waterfall([
    initFileUpload.bind(this, srcPath, destPath),
    doFileUpload.bind(this, srcPath, destPath)
  ], callback);
};