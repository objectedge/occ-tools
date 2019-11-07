'use strict';

var util = require('util');
var _config = require('../config');

module.exports = function(themeId, options, callback) {
  options = options || {};

  if (!themeId) {
    themeId = _config.theme.id;
  }

  var siteId = options.site || 'siteUS';
  var url = util.format('/themes/%s/compile', themeId);
  this._occ.request(
    {
      api: url,
      method: 'post',
      body: {
        siteId: siteId
      }
    },
    function(error, body) {
      if (error || (body && body.errorCode)) {
        callback(error || body.message);
      }
      callback();
    }
  );
};
