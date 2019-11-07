'use strict';

var winston = require('winston');
const cTable = require('console.table');

function formatByteSize(bytes) {
  if (bytes < 1024) {
    return bytes + 'bytes';
  } else if (bytes < 1048576) {
    return (bytes / 1024).toFixed(2) + 'KB';
  } else if (bytes < 1073741824) {
    return (bytes / 1048576).toFixed(2) + 'MB';
  } else {
    return (bytes / 1073741824).toFixed(2) + 'GB';
  }
}

module.exports = function(callback) {
  winston.info('Listing server-side extensions...');
  var self = this;
  self._occ.request('serverExtensions', function(error, body) {
    self._occ.checkError(error, body, callback);

    if (body.items && body.items.length > 0) {
      var sses = [];
      body.items.forEach(function(sse) {
        sses.push({
          ID: sse.name.replace('.zip', ''),
          'Last Modified': new Date(sse.lastModified).toLocaleString(),
          Size: formatByteSize(sse.size),
          Checksum: sse.checksum
        });
      });
      console.table(sses);
    } else {
      winston.info('No server-side extension installed.');
    }

    callback();
  });
};
