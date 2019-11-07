'use strict';

var winston = require('winston');
var minimatch = require('minimatch');
var path = require('path');
/**
 * Recursively delete all files.
 *
 * @param {String} folder the OCC folder to delete files
 * @param {Number} offset of the array to be added to final array
 * @param {String} pattern the glob pattern
 * @param {Function} callback the callback function
 */
function listAndDeleteFiles(folder, offset, pattern, callback) {
  var self = this;
  var options = {
    api: '/files',
    method: 'get',
    qs: {
      folder: folder,
      offset: offset,
      assetType: 'all'
    }
  };

  self._occ.request(options, function (error, response) {
    if (error) {
      callback('Error while listing the files');
    }

    if (response.errorCode || response.error || parseInt(response.status) >= 400) {
      callback(response.message);
    }

    if (!response.items || !response.items.length) {
      winston.warn('No files to delete');
      callback();
    }

    var filePaths =
      response.items
        .filter(function (file) {
          return minimatch(file.path, pattern);
        })
        .map(function (item) {
          return item.path;
        });

    winston.info('Deleting %d files...', filePaths.length);

    if (filePaths && filePaths.length) {
      self._occ.request({
        api: '/files/deleteFiles',
        method: 'post',
        body: {
          deletePaths: filePaths,
          recursive: true
        }
      }, function (error, deleteResponse) {
        if (error) {
          callback(error);
        }

        if (deleteResponse.errorCode || deleteResponse.error || parseInt(deleteResponse.status) >= 400) {
          callback(deleteResponse.message);
        }

        // If there are more items to delete, then download next page
        if (response.offset + response.limit < response.total) {
          listAndDeleteFiles.call(
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
    } else if (response.offset + response.limit < response.total) {
      listAndDeleteFiles.call(
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
}
/**
 * Delete files from OCC
 *
 * @param {String} file the file name (partial match) or all to delete all files
 * @param {Object} settings command options
 * @param {Function} callback the callback function
 */
module.exports = function (file, settings, callback) {
  winston.info('Deleting %s files of folder /%s', file, settings.folder);

  // Recusively delete all files
  listAndDeleteFiles.call(
    this,
    settings.folder, // folder to delete
    0, // starts on offset 0
    path.join('/', settings.folder, file), // glob pattern
    callback
  );
};
