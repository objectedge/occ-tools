'use strict';

var async = require('async');
var remoteContent = require('./remote-content');
var _github;

function listRemoteDir(options, pathsArray, callback) {
  async.waterfall([
    function (callback) {
      remoteContent(_github, options, callback);
    },
    function (repoInfo, callback) {

      async.each(repoInfo.data, function (item, callback) {
        if (item.type === 'dir') {
          var dirOptions = JSON.parse(JSON.stringify(options));
          dirOptions.remotePath = item.path;
          listRemoteDir(dirOptions, pathsArray, callback);
        } else {
          pathsArray.push(item.path);
          return callback();
        }
      }, callback);
    }
  ], callback);
}

module.exports = function (github, options, callback) {
  callback = callback || function () { };

  var remotePaths = [];
  _github = github;

  async.waterfall([
    function (callback) {
      listRemoteDir(options, remotePaths, callback);
    },
    function (callback) {
      async.map(remotePaths, function (path, callback) {
        var fileOptions = JSON.parse(JSON.stringify(options));
        fileOptions.remotePath = path;
        remoteContent(_github, fileOptions,
          function (err, path) {
            if (options.each) {
              options.each(err, path.data, callback);
            }
          });
      }, callback);
    }
  ], function (err) {
    if (err) {
      callback(err, null);
      return;
    }

    callback(null, remotePaths);
  });
};
