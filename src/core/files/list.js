'use strict';

var path = require('path');
var winston = require('winston');
const cTable = require('console.table');
var util = require('util');

/**
 * Convert a number of bytes to a human-readable string
 *
 * @param {Number} bytes amount of bytes
 * @returns a string representing the file size
 */
function formatByteSize(bytes) {
  if (bytes < 1024) return bytes + 'bytes';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + 'KB';
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + 'MB';
  else return (bytes / 1073741824).toFixed(2) + 'GB';
}

/**
 * List files from OCC
 *
 * @param {Object} settings command settings
 * @param {Function} callback callback function
 */
module.exports = function (settings, callback) {
  winston.info(
    'Listing files of folder /%s from %d to %d',
    settings.folder,
    settings.offset,
    settings.offset + settings.limit
  );

  // list files from OCC
  var options = {
    api: '/files',
    method: 'get',
    qs: {
      folder: settings.folder,
      sort: util.format('type:desc,%s', settings.sort),
      limit: settings.limit,
      offset: settings.offset,
      assetType: settings.type,
      filter: settings.query
    }
  };

  this._occ.request(options, function (error, response) {
    if (error) {
      callback('Error while listing the files');
    }

    if (parseInt(response.status) >= 400) {
      callback(response.message);
    }

    if (!response.items || !response.items.length) {
      winston.warn('No files to list');
      callback();
    }

    // format the results
    var files = response.items.map(function (file) {
      return {
        Path: file.path.replace(path.join('/', settings.folder), ''),
        Type: file.type == 'fileFolder' ? 'folder' : file.type,
        Size: file.size ? formatByteSize(file.size) : '-',
        Checksum: file.checksum || '-',
        'Last Modified': file.lastModified ? new Date(file.lastModified).toLocaleString() : '-'
      };
    });

    // print the results
    console.table(files);

    // inform if there are more files
    if (response.offset + response.limit < response.total) {
      winston.info('And more %d items...', response.total - (response.offset + response.limit));
    }

    callback();
  });
};
