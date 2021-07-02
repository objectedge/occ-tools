'use strict';

var path = require('path');
var fs = require('fs-extra');
var async = require('async');
var cheerio = require('cheerio');
var request = require('request');
var winston = require('winston');

var config = require('../config');

/**
 * Add the base URL if is relative path.
 * @param  {String} url The url path.
 * @return {String}     The prepended url.
 */
var prependBaseURLIfRelative = function (url) {
  if (url.indexOf('http') == -1) {
    return config.endpoints.baseUrl + '/' + url;
  } else {
    return url;
  }
};

/**
 * Load the storefront home page HTML.
 * @param  {Function} callback The fn to be executed after load.
 */
function loadHtmlFromStorefrontHome(httpAuth, siteId, callback) {
  winston.info('Loading storefront home page HTML...');
  request(config.endpoints.baseUrl + '?occsite=' + siteId, function(err, httpResponse, body) {
    return callback(err, body);
  });
}

/**
 * Get the CSS files meta from loaded HTML.
 * @param  {[type]}   homeHtml The home page HTML.
 * @param  {Function} callback The fn to be executed after getting the meta.
 */
function getCssFilesMetaFromHtml(homeHtml, callback) {
  var homeDOM = cheerio.load(homeHtml);
  var fileMeta = [];
  homeDOM('link').each(function(i, link) {
    var linkHref = cheerio(link).attr('href');

    if(!linkHref) {
      return;
    }

    var resourceHref = prependBaseURLIfRelative(linkHref);
    var fileName = resourceHref.split('/').pop();

    if(fileName) {
      fileMeta.push({
        href: resourceHref,
        name: fileName
      });
    }
  });

  return fileMeta.length > 0 ? callback(null, fileMeta) : callback(new Error('no css files found in HTML.'));
}

/**
 * Get the token to download the css files.
 * @param  {[type]}   cssFileMeta The css files meta.
 * @param  {Function} callback    The fn to be executed after getting token.
 */
function getFileToken(cssFileMeta, callback) {
  var self = this;

  self._auth.signIn(config.credentials, function(err) {
    if (err) return callback(err);
    self._auth.getToken('file', function(err, token) {
      return callback(err, cssFileMeta, token);
    });
  });
}

/**
 * Process all the import files on style.css style and merge them
 * into style.css
 *
 * @param  {Object}   err Error on style file.
 * @param  {Object}   styleCssFileMeta   Meta file object of the style.css
 * @param  {String} fileToken    User Token
 * @param  {String} styleCSSBody    The style.css content
 * @param  {Function} callback    The done function to be called when all changes have been on style.css file
 */
function processStyleImports(err, styleCssFileMeta, fileToken, styleCSSBody, callback) {
  var storefrontAbsoluteCSSPath = path.dirname(styleCssFileMeta.href);
  var importFiles = styleCSSBody.match(/@import\s["'](.*)?['"]/g);
  var buffer = '';

  //Just merge each import file into style.css
  var mergeStyle = function (next, err, importCssFileMeta, importBody) {
    if(err) {
      throw err;
    }

    buffer += importBody;
    next();
  };

  //If there are imports, process them
  if(importFiles) {
    async.each(importFiles, function(importFile, next) {
      importFile = importFile.replace(/@import\s'/, '').replace('\'', '');

      //Just create a file meta for each import file
      var importFileMeta = {
        name: importFile,
        href: storefrontAbsoluteCSSPath + '/' + importFile
      };

      //Call download css file
      downloadCssFile(importFileMeta, fileToken, mergeStyle.bind(null, next));
    }, function () {
      callback(err, styleCssFileMeta, buffer);
    });
  } else {
    return callback(err, styleCssFileMeta, styleCSSBody);
  }
}

/**
 * Download a single css file.
 * @param  {[type]}   cssFileMeta The css file meta.
 * @param  {[type]}   fileToken   The file token.
 * @param  {Function} callback    The fn to be executed after download.
 * @param  {Function} httpAuth    HTTP Auth.
 */
function downloadCssFile(cssFileMeta, fileToken, callback, httpAuth) {
  var jar = request.jar();
  JSON.parse(fileToken).forEach((c) => {
    var cookie = request.cookie(c);
    jar.setCookie(cookie, cssFileMeta.href);
  });
  winston.info('Downloading css file %s...', cssFileMeta.href);

  var requestObject = { url: cssFileMeta.href, jar: jar };

  if(/ccstore/.test(cssFileMeta.href) && httpAuth) {
    requestObject.auth = httpAuth;
  }

  request(requestObject, function(err, httpResponse, body) {
    if(cssFileMeta.name !== 'style.css') {
      return callback(err, cssFileMeta, body);
    }

    //Process style.css because it has some imports which we have to have downloaded locally
    processStyleImports(err, cssFileMeta, fileToken, body, callback);
  });
}

/**
 * Write the CSS file to file system.
 * @param  {[type]}   destDir        The destination directory.
 * @param  {[type]}   cssFileContent The css file content.
 * @param  {Function} callback       The fn to be executed after write.
 */
function writeCssFile(destDir, cssFileContent, callback) {
  winston.info('Saving css file to %s...', destDir);
  fs.writeFile(destDir, cssFileContent, callback);
}

/**
 * Downloads all css files.
 * @param  {[type]}   cssFilesMeta The css files meta.
 * @param  {[type]}   fileToken    The file token.
 * @param  {[type]}   destDir      The destination dir.
 * @param  {Function} callback     The fn to be executed after download.
 * @param  {Object}   httpAuth     HTTP Auth
 */
function downloadCssFiles(cssFilesMeta, fileToken, destDir, callback, httpAuth) {
  async.each(cssFilesMeta, function(cssFileMeta, callback) {
    if (cssFileMeta.name.startsWith('ccstore-')){
      callback();
    }else{
      async.waterfall([
        function(callback) {
          downloadCssFile(cssFileMeta, fileToken, callback, httpAuth);
        },
        function(cssFileMeta, cssFileContent, callback) {
          var pieces = cssFileMeta.name.split('?');
          var filename = pieces[0];
          writeCssFile(path.join(destDir, filename), cssFileContent, callback);
        }
      ], callback);
    }
  }, callback);
}

module.exports = function(destDir, callback, httpAuth, siteId) {
  var self = this;

  async.waterfall([
    function(callback){
      loadHtmlFromStorefrontHome.call(self, httpAuth, siteId, callback);
    },
    getCssFilesMetaFromHtml.bind(self),
    getFileToken.bind(self),
    function(cssFilesMeta, fileToken, callback) {
      downloadCssFiles.call(self, cssFilesMeta, fileToken, destDir, callback, httpAuth);
    }
  ], callback);
};
