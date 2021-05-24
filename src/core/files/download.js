'use strict';

var fs = require('fs-extra');
var path = require('path');
var winston = require('winston');
var async = require('async');
var minimatch = require('minimatch');
var _configs = require('../config');

// Number of parallel downloads
var PARALLEL_DOWNLOADS = 8;

/**
 * Recursively download all files.
 *
 * @param {String} folder the OCC folder to download files
 * @param {Number} offset of the array to be added to final array
 * @param {String} pattern the glob pattern
 * @param {Function} callback the callback function
 */
function listAndDownloadFiles(folder, offset, pattern, callback) {
  var self = this;
  var options = {
    api: '/files',
    method: 'get',
    qs: {
      folder: folder,
      offset: offset,
      assetType: 'file'
    }
  };

  self._occ.request(options, function (error, response) {
    if (error) {
      callback('Error while listing the files');
    }

    if (parseInt(response.status) >= 400) {
      callback(response.message);
    }

    if (!response.items || !response.items.length) {
      winston.warn('No files to download');
      callback();
    }
    var files =
      response.items
        .filter(function (file) {
          return minimatch(file.path, pattern);
        });

    // download the files in parallel
    async.eachLimit(
      files,
      PARALLEL_DOWNLOADS,
      function (file, cb) {
        winston.info('Downloading file %s...', file.path);
        var filePath = path.join(_configs.dir.project_root, 'files', file.path);
        fs.ensureDir(path.dirname(filePath), function () {
          // download the file from OCC
          self._occ.request({
            url: file.url,
            method: 'get',
            download: filePath,
          }, cb);
        });
      }, function (error) {
        if (error) callback(error);

        // If there are more items to download, then download next page
        if (response.offset + response.limit < response.total) {
          listAndDownloadFiles.call(
            self,
            folder,
            response.offset + response.limit, // next page
            pattern,
            callback
          );
        } else {
          // finalize the process
          callback();
        }
      });

  });
}
/**
 * Download files from OCC
 *
 * @param {String} file the file name (partial mathch) or all to download all files
 * @param {Object} settings command options
 * @param {Function} callback the callback function
 */
module.exports = function (file, settings, callback) {
  winston.info('Dowloading %s files of folder /%s', file, settings.folder);

  // Recusively download all files
  listAndDownloadFiles.call(
    this,
    settings.folder, // folder to download
    0, // starts on offset 0
    path.join('/', settings.folder, file), // glob pattern
    callback
  );
};
