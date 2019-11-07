var path = require('path');
var fs = require('fs-extra');
var winston = require('winston');
var github = require('../github');
var _config = require('../config');
var os = require('os');
var async = require('async');
var extract = require('extract-zip');

function getSSEFilePath(name, options, metadata, remoteRootFolder) {

  var localRootFolder = path.join(name);
  var replacedRemoteFilePath = metadata.path.replace(/template/g, name);

  var remoteFolder = path.relative(remoteRootFolder, replacedRemoteFilePath);

  return path.join(_config.dir.server_side_root, localRootFolder, remoteFolder);
}

function downloadSdk(name, options, occ, callback) {
  var tempFile = path.join(os.tmpdir(), 'tmp-rest-sdk.zip');
  var tempDir = path.join(os.tmpdir(), 'tmp-rest-sdk');
  winston.info('Donwloading Commerce Cloud SDK from OCC...');
  async.waterfall(
    [
      function(callback){
        occ.request({
          url: _config.endpoints.baseUrl + '/occs-admin/js/oracle-commerce-sdk.zip',
          method: 'get',
          body: true,
          download: tempFile
        }, callback);
      },
      function(error, callback) {
        if (error) {
          error('Error while downloading Commerce Cloud SDK.');
        } else {
          extract(tempFile, { dir: tempDir}, callback);
        }
      },
      fs.copy.bind(
        null,
        path.join(tempDir, 'oracle-commerce-sdk', 'lib', 'commerce-rest.js'),
        path.join(_config.dir.server_side_root, name, 'app', 'sdk', 'commerce-rest.js')
      ),
      fs.unlink.bind(null, tempFile),
      fs.remove.bind(null, tempDir)
    ],
    callback
  );
}


function generateSSEFromDefault(name, options, occ, callback) {
  var remoteSettingsPath = 'samples/server-side-extensions/template';

  winston.info('Retrieving boilerplate from OCC Components repository...');
  github.list({
    repo: 'occ-components',
    remotePath: remoteSettingsPath,
    each: function (error, metadata, cb) {
      if(error)  {
        callback(error, null);
        return;
      }

      var filePath = getSSEFilePath(name, options, metadata, remoteSettingsPath);

      var content = new Buffer(metadata.content, 'base64').toString();
      content = content.replace(/__TITLE__/g, name);

      winston.info('Creating file %s...', metadata.name);
      fs.outputFile(filePath, content, cb);
    }
  }, function(error) {
    if (error) {
      callback(error);
    } else if (options.sdk) {
      downloadSdk(name, options, occ, callback);
    } else {
      callback();
    }
  });
}

module.exports = function (name, options, callback) {
  winston.info('Generating server side extension %s...', name);

  generateSSEFromDefault(name, options, this._occ, callback);
};
