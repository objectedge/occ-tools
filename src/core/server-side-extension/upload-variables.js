var fs = require('fs-extra');
var async = require('async');
var winston = require('winston');
var util = require('util');
var _utils = require('./utils');

module.exports = function(variableName, settings, callback) {
  var self = this;
  self.variablesFile = settings.file || _utils.defaultPath;
  self.localItems = [];
  self.remoteItems = [];

  var readLocalItems = function(callback) {
    winston.info('Reading file %s...', self.variablesFile);
    fs.readFile(self.variablesFile, 'utf8', function(error, variables) {
      if (error) {
        callback(error);
      }

      try {
        self.localItems = JSON.parse(variables);
      } catch(e) {
        winston.error(e.message);
        callback(util.format('Error reading the JSON file %s.', self.variablesFile));
      }
      callback();
    });
  };

  var getVariablesFromOCC = function(callback) {
    _utils.getVariables(
      self._occ,
      function(error, items) {
        if (error) {
          callback(error);
        }

        self.remoteItems = items;
        callback();
      }
    );
  };

  var uploadVariable = function(variable, callback) {
    var options = {
      body: {
        name: variable.name,
        value: variable.value
      }
    };

    var remoteItem = self.remoteItems.find(function(item){
      return item.name === variable.name;
    });

    if (!remoteItem) {
      winston.info('Creating the %s variable on OCC...', variable.name);
      options.api = '/extensionEnvironmentVariables';
      options.method = 'post';
    } else {
      winston.info('Updating the %s variable on OCC...', variable.name);
      options.api = util.format('/extensionEnvironmentVariables/%s', remoteItem.id);
      options.method = 'put';
    }

    self._occ.request(options, function(error, body) {
      self._occ.checkError(error, body, callback);

      callback();
    });
  };

  var uploadVariables = function(callback) {
    if (variableName) {
      var variable = self.localItems.find(function(element) {
        return element.name === variableName;
      });

      if (variable){
        uploadVariable(variable, callback);
      } else {
        callback(util.format('No variable with name %s on the variables file.', variableName));
      }
    } else {
      async.each(self.localItems, uploadVariable, callback);
    }
  };

  var checkForMissingVariables = function(callback) {
    var localItems = self.localItems.map(function(item) { return item.name; });
    var missingItems = self.remoteItems.filter(function(item) {
      return !localItems.includes(item.name);
    }).map(function(item) { return item.name; });

    if (missingItems && missingItems.length) {
      winston.warn('The following variables are missing locally: \n%s', missingItems.join('\n'));
      winston.warn('You can use download command to keep your local repository up-to-date.');
    }

    callback();
  };

  if (variableName){
    winston.info('Uploading %s server-side extension variable to OCC...', variableName);
  } else {
    winston.info('Uploading all server-side extension variables to OCC...');
  }

  async.waterfall(
    [
      readLocalItems,
      getVariablesFromOCC,
      uploadVariables,
      checkForMissingVariables
    ],
    callback
  );
};
