'use strict';

var fs = require('fs-extra');
var path = require('path');
var async = require('async');
var winston = require('winston');
var util = require('util');
var _config = require('../config');

/**
 * Upload a stack to OCC
 *
 * @param {String} stackName the stack name
 * @param {Object} settings the command options
 * @param {Function} callback the callback function
 */
module.exports = function (stackName, settings, callback) {
  var self = this;

  /**
   * Find the stack ID given its name
   *
   * @param {*} callback the callback function
   */
  var findStackId = function (callback) {
    winston.info('Finding stack with name %s', stackName);
    var options = {
      api: '/stacks',
      method: 'get'
    };

    self._occ.request(options, function (error, response) {
      if (error) {
        callback('Error while listing the stacks');
      }

      // match the stack by name or id
      var stacks = response.items.filter(function (stack) {
        return stack.name === stackName || stack.repositoryId === stackName;
      });

      if (!stacks.length) {
        callback(util.format('No stack found with name %s', stackName));
      }

      var stackTitle = stacks[0].name;
      var pathStruct = path.join(_config.dir.project_root, 'stacks', stackTitle, 'stack', stackTitle);
      var pathStructSimple = path.join(_config.dir.project_root, 'stacks', stackTitle);
      var pathStructUse =  fs.existsSync(pathStruct) ? pathStruct : pathStructSimple;
      callback(null, stacks, pathStructUse);
    });
  };

  /**
   * Check if the stack exists locally
   *
   * @param {String} stackId the stack ID
   * @param {String} stackFolder the local stack folder
   * @param {Function} callback the callback folder
   */
  var checkPath = function (stacks, stackFolder, callback) {
    winston.info('Checking files consistency');
    fs.lstat(stackFolder, function (error) {
      if (error) {
        callback('Stack does not exist locally.');
      }
      callback(null, stacks, stackFolder);
    });
  };

  /**
   * Upload the stack LESS
   *
   * @param {String} stackId the stack ID
   * @param {String} stackFolder the local stack folder
   * @param {Function} callback the callback folder
   */
  var uploadLess = function (stacks, stackFolder, callback) {
    winston.info('Uploading stack less...');
    async.waterfall([
      function (callback) {
        var fileLess =  fs.existsSync(path.join(stackFolder, 'less', 'stack.less')) ? path.join(stackFolder, 'less', 'stack.less') : path.join(stackFolder, 'stack.less');
        fs.readFile(fileLess, 'utf8', callback);
      },
      function (fileData, callback) {
        async.each(
          stacks,
          function(stack, callback) {
            var options = {
              api: util.format('/stacks/%s/less', stack.repositoryId),
              method: 'put',
              body: {
                source: fileData
              }
            };
            self._occ.request(options, function (error, data) {
              if (error){
                return callback(error);
              }
              if (data && data.errorCode) {
                winston.warn('%s: %s - %s', stack.repositoryId, data.errorCode, data.message);
              }
              return callback();
            });
          },
          callback);
      }
    ], function (error) {
      if (error){
        callback(error);
      }
      callback(null, stacks, stackFolder);
    });
  };

  /**
   * Upload the stack LESS variables
   *
   * @param {String} stackId the stack ID
   * @param {String} stackFolder the local stack folder
   * @param {Function} callback the callback folder
   */
  var uploadLessVariables = function (stacks, stackFolder, callback) {
    winston.info('Uploading stack less variables...');
    async.waterfall([
      function (callback) {
        var fileLessVariables =  fs.existsSync(path.join(stackFolder, 'less', 'stack-variables.less')) ? path.join(stackFolder, 'less', 'stack-variables.less') : path.join(stackFolder, 'stack-variables.less');
        fs.readFile(fileLessVariables, 'utf8', callback);
      },
      function (fileData, callback) {
        async.each(
          stacks,
          function(stack, callback) {
            var options = {
              api: util.format('/stacks/%s/lessvars', stack.repositoryId),
              method: 'put',
              body: {
                source: fileData
              }
            };
            self._occ.request(options, function (error, data) {
              if (error) {
                return callback(error);
              }
              if (data && data.errorCode) {
                winston.warn('%s: %s - %s', stack.repositoryId, data.errorCode, data.message);
              }
              return callback();
            });
          },
        callback);
      }
    ], function (error) {
      if (error) {
        callback(error);
      }
      callback(null, stacks, stackFolder);
    });
  };

  /**
   * Download the stack LESS
   *
   * @param {String} stackId the stack ID
   * @param {String} stackFolder the local stack folder
   * @param {Function} callback the callback folder
   */
  var uploadTemplate = function (stacks, stackFolder, callback) {
    winston.info('Uploading stack template...');
    async.waterfall([
      function (callback) {
        var fileTemplate =  fs.existsSync(path.join(stackFolder, 'templates', 'stack.template')) ? path.join(stackFolder, 'templates', 'stack.template') : path.join(stackFolder, 'stack.template');
        fs.readFile(fileTemplate, 'utf8', callback);
      },
      function (fileData, callback) {
        async.each(
          stacks,
          function(stack, callback) {
            var options = {
              api: util.format('/stacks/%s/code', stack.repositoryId),
              method: 'put',
              body: {
                source: fileData
              }
            };
            self._occ.request(options, function (error, data) {
              if (error) {
                return callback(error);
              }
              if (data && data.errorCode) {
                winston.warn('%s: %s - %s', stack.repositoryId, data.errorCode, data.message);
              }
              return callback();
            });
          },
        callback);
      }
    ], callback);
  };

  winston.info('Uploading stack %s', stackName);
  async.waterfall([
    findStackId,
    checkPath,
    uploadLess,
    uploadLessVariables,
    uploadTemplate
  ], callback);
};
