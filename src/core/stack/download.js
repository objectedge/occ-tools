'use strict';

var fs = require('fs-extra');
var path = require('path');
var async = require('async');
var winston = require('winston');
var util = require('util');
var _config = require('../config');

/**
 * Download a stack from OCC gives its name
 *
 * @param {String} stackName the stack name
 * @param {Object} settings the command configuration
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
      var stack = response.items.filter(function (stack) {
        return stack.name == stackName || stack.repositoryId == stackName;
      });

      // if no stack found, return an error
      if (!stack.length) {
        callback(util.format('No stack found with name %s', stackName));
      }

      callback(null, stack[0].repositoryId, path.join(_config.dir.project_root, 'stacks', stack[0].name));
    });
  };

  /**
   * Download the stack LESS
   *
   * @param {String} stackId the stack ID
   * @param {String} stackFolder the local stack folder
   * @param {Function} callback the callback folder
   */
  var downloadLess = function (stackId, stackFolder, callback) {
    winston.info('Downloading stack less...');

    var options = {
      api: util.format('/stacks/%s/less', stackId),
      method: 'get'
    };

    self._occ.request(options, function (error, file) {
      if (error) return callback(error);
      
      fs.outputFile(path.join(stackFolder, 'stack.less'), file.source, function () {
        callback(null, stackId, stackFolder);
      });
    });
  };

  /**
   * Download the stack LESS variables file
   *
   * @param {String} stackId the stack ID
   * @param {String} stackFolder the local stack folder
   * @param {Function} callback the callback folder
   */
  var downloadLessVariables = function (stackId, stackFolder, callback) {
    winston.info('Downloading stack less variables...');

    var options = {
      api: util.format('/stacks/%s/lessvars', stackId),
      method: 'get'
    };

    self._occ.request(options, function (error, file) {
      if (error) return callback(error);

      fs.outputFile(path.join(stackFolder, 'stack-variables.less'), file.source, function () {
        callback(null, stackId, stackFolder);
      });
    });
  };

  /**
   * Download the stack template
   *
   * @param {String} stackId the stack ID
   * @param {String} stackFolder the local stack folder
   * @param {Function} callback the callback folder
   */
  var downloadTemplate = function (stackId, stackFolder, callback) {
    winston.info('Downloading stack template...');

    var options = {
      api: util.format('/stacks/%s/code', stackId),
      method: 'get'
    };

    self._occ.request(options, function (error, file) {
      if (error) return callback(error);
      
      fs.outputFile(path.join(stackFolder, 'stack.template'), file.source, callback);
    });
  };

  winston.info('Downloading stack ' + stackName);
  async.waterfall([
    findStackId,
    downloadLess,
    downloadLessVariables,
    downloadTemplate
  ], callback);
};
