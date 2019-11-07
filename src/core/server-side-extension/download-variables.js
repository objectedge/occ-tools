var fs = require('fs-extra');
var winston = require('winston');
var async = require('async');
var util = require('util');
var _utils = require('./utils');
/**
 * Download server-side extension variables from OCC
 *
 * @param {Object} settings command options
 * @param {Function} callback the callback function
 */
module.exports = function(settings, callback) {
  var self = this;
  self.variablesFile = settings.file || _utils.defaultPath;
  self.merge = settings.merge;
  self.data = [];
  winston.info('Dowloading server-side extension variables from OCC..');

  var getVariables = function(callback) {
    _utils.getVariables(
      self._occ,
      function(error, items) {
        if (error) {
          callback(error);
        }

        self.data = items.map(function(variable){
          return { name: variable.name, value: variable.value };
        });

        callback();
      }
    );
  };

  var mergeItems = function(callback) {
    if (self.merge) {
      fs.readFile(self.variablesFile, 'utf8', function(error, localVariables) {
        if (error) {
          callback(error);
        }

        try {
          localVariables = JSON.parse(localVariables);
        } catch(e) {
          winston.error(e.message);
          callback(util.format('Error while reading the JSON file %s...', self.variablesFile));
        }

        self.data.forEach(function(remoteVariable) {
          var localVariable = localVariables.find(function(localItem) {
            return (localItem.name === remoteVariable.name);
          });
          if (localVariable) {
            winston.info('Updating variable: %s...', localVariable.name);
            localVariable.value = remoteVariable.value;
          } else {
            winston.info('Adding variable: %s...', remoteVariable.name);
            localVariables.push({
              name: remoteVariable.name,
              value: remoteVariable.value
            });
          }
        });

        self.data = localVariables;
        callback();
      });
    } else {
      callback();
    }
  };

  var writeFile = function(callback) {
    winston.info('Storing variables on file %s...', self.variablesFile);
    fs.outputFile(
      self.variablesFile,
      JSON.stringify(self.data, null, 2),
      callback
    );
  };

  async.waterfall([getVariables, mergeItems, writeFile], callback);
};
