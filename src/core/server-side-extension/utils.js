var winston = require('winston');
var path = require('path');
var _configs = require('../config');

function getVariables(items, occ, offset, callback) {
  winston.info('Listing server-side extension variables from OCC...');
  occ.request(
    {
      api: 'extensionEnvironmentVariables',
      method: 'get',
      qs: {
        limit: _configs.OCC_DEFAULT_LIMIT,
        offset: offset
      }
    },
    function(error, body) {
      occ.checkError(error, body, callback);

      items = items.concat(body.items);
      var next = body.links.find(function(item) {
        return item.rel === 'next';
      });

      if (next) {
        getVariables(items, occ, offset + _configs.OCC_DEFAULT_LIMIT, callback);
      } else {
        callback(null, items);
      }
    }
  );
}


function getAllVariables(occ, callback) {
  getVariables([], occ, 0, function(error, items) {
    if (error) {
      callback(error);
    } else {
      callback(null, items);
    }
  });
}

module.exports = {
  getVariables: getAllVariables,
  defaultPath: path.join(_configs.dir.server_side_root, 'variables.json')
};
