'use strict';

var fs = require('fs-extra');
var os = require('os');
var path = require('path');
var async = require('async');
var winston = require('winston');
var archiver = require('archiver');
var _config = require('../config');
var util = require('util');
var shelljs = require('shelljs');
var glob = require('glob');

function uploadSSE(name, opts, callback) {
  var self = this;

  // temporary zip file to be uploaded
  var tempFile = path.join(os.tmpdir(), util.format('%s.zip', name));

  // source path
  var sourceDir = path.join(_config.dir.server_side_root, name);

  /**
   * Install Node Modules
   */
  var installModules = function(installationCallback) {
    if(!opts.npm) {
      return installationCallback();
    }

    async.waterfall([
      function(next) {
        winston.info('Removing node_modules');
        if(shelljs.rm('-rf', path.join(sourceDir, 'node_modules')).code !== 0) {
          next('Error on removing node modules');
        } else {
          next();
        }
      },
      function(next) {
        winston.info('Installing dependencies');
        if(shelljs.exec('cd ' + '"' + sourceDir + '"' + ' && npm install --only=prod').code !== 0) {
          next('Error on installing dependencies');
        } else {
          next();
        }
      }
    ], installationCallback);
  };

  /**
   * Checks if the resource folder exists locally.
   */
  var checkSSEPath = function(callback) {
    winston.info('Preparing upload for SSE "' + name + '"...');
    winston.info('Checking files consistency...');
    fs.lstat(sourceDir, (error) => {
      if (error) {
        callback('Extension does not exist locally.');
      }

      callback();
    });
  };

  /**
   * Writes the zip file with the resource.
   */
  var zipFiles = function(callback) {
    winston.info('Zipping files to upload...');
    var output = fs.createWriteStream(tempFile).on('close', function() {
      callback();
    });
    var archive = archiver('zip').on('error', function(error) {
      callback('Error while creating the zip file.');
    });

    archive.pipe(output);
    archive.glob(path.join('**', '*'), {
      cwd: sourceDir,
      ignore: ['package-lock.json']
    });
    archive.finalize();
  };

  /**
   * Uploads the resource to OCC.
   */
  var uploadToOCC = function(callback) {
    winston.info('Uploading %s server side extension...', name);

    var options = {
      api: 'serverExtensions',
      method: 'post',
      formData: {
        filename: name + '.zip',
        uploadType: 'extensions',
        force: 'true',
        fileUpload: fs.createReadStream(tempFile)
      }
    };
    self._occ.request(options, function(error, body) {
      self._occ.checkError(error, body, callback);

      callback();
    });
  };

  /**
   * Check if server is up and push SSE Configs
   */
  var pushSSEConfigs = function(callback) {
    var time = opts.delay;
    var maxAttempts = opts.times;
    var attempts = 1;

    winston.info('Checking if the SSE server is up...');

    var makeSSEServerCall = function (done) {
      var options = {
        body: {}
      };

      options.api = 'servers/push';
      options.method = 'post';

      winston.info('Pushing SSE Configs...');

      self._occ_sse.request(options, function(error, body) {
        // no content return, SSE server is up
        if(!error && body === '') {
          done();
        } else {
          done(body);
        }
      });
    };

    var checkServer = function (error) {
      if(error && maxAttempts === attempts) {
        return callback('The SSE Server is not up and we have reached the maximum attempts. Please try again later...');
      }

      if(!error) {
        return callback();
      }

      winston.info('SSE Server is still not up... checking again in ' + time + 'ms');
      winston.info('Attempt number ' + attempts + '...');
      setTimeout(function () {
        makeSSEServerCall(checkServer);
      }, time);

      attempts++;
    };

    makeSSEServerCall(checkServer);
  };

  /**
   * Removes local temporary file.
   */
  var clearTemporaryFile = function(callback) {
    winston.info('Removing temporary files...');
    fs.unlink(tempFile, callback);
  };

  async.waterfall(
    [checkSSEPath, installModules, zipFiles, pushSSEConfigs, uploadToOCC, pushSSEConfigs, clearTemporaryFile],
    callback
  );
}

function listAllLocalSSEs(done) {
  var ssesPath = path.join(_config.dir.server_side_root, '*');
  var ssesNames = [];
  glob(ssesPath)
    .on('match', function (sseAbsolutePath) {
      var sseName = path.basename(sseAbsolutePath);

      if(sseName !== 'logs') {
        ssesNames.push(sseName);
      }
    })
    .on('end', function () {
      done(ssesNames);
    });
}

module.exports = function(name, opts, callback) {
  var self = this;
  var skippedSSEs = opts.skip || [];

  var processMultipleNames = function(names) {
    var filteredNames = names.filter(function(currentName) {
      return !skippedSSEs.includes(currentName);
    });

    var ssesUpload = filteredNames.map(function (currentName) {
      return uploadSSE.bind(self, currentName, opts);
    });

    async.waterfall(ssesUpload, callback);
  };

  if(opts.all) {
    return listAllLocalSSEs(processMultipleNames);
  }

  if(Array.isArray(opts.names)) {
    processMultipleNames(opts.names);
  } else {
    uploadSSE.call(self, name, opts, callback);
  }
};
