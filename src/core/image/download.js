'use strict';

var fs = require('fs');
var path = require('path');
var url = require('url');
var util = require('util');

var async = require('async');
var winston = require('winston');
var request = require('request');

var config = require('../config');

var _getImagesMeta = function(imageName, callback) {
  if (imageName) {
    return callback && callback(null, [{path: util.format('/general/%s', imageName), name: imageName}]);
  }

  this._occ.request('files/mediaContents?folder=general&totalResults=true&limit=100000', function(err, data) {
    return callback && callback(err, data && data.items || []);
  });
};

var _downloadImages = function(imagesMeta, callback) {
  var self = this;
  var count = 0;
  var total = imagesMeta.length;
  async.each(
    imagesMeta,
    function (item, callback) {
      var currentCount = ++count;
      winston.info('Image %d: Downloading %s...', currentCount, item.name);
      async.waterfall(
        [
          function (callback) {
            self._auth.getToken('file', callback);
          },
          function (fileToken, callback) {
            var _url = url.resolve(config.endpoints.baseUrl, 'file', item.path);
            var jar = request.jar();
            JSON.parse(fileToken).forEach((c) => {
              var cookie = request.cookie(c);
              jar.setCookie(cookie, _url);
            });
            request({ url: _url, jar: jar })
              .pipe(fs.createWriteStream(path.join('images', item.name)))
              .on('close', function () {
                winston.info('Image %d: %s downloaded.', currentCount, item.name);
                return callback && callback();
              })
              .on('error', function (err) {
                winston.warn('Image %d: %s could not be downloaded. %s', currentCount, item.name, err.message);
                return callback && callback();
              });
          },
        ],
        callback
      );
    },
    function (err) {
      winston.info('%d/%d images downloaded.', count, total);
      return callback && callback(err);
    }
  );
};

module.exports = function(imageName, callback) {
  winston.info('Getting images info from OCC...');
  async.waterfall([
    _getImagesMeta.bind(this, imageName),
    _downloadImages.bind(this)
  ], callback);
};
