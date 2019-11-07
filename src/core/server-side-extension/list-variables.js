var winston = require('winston');
var _utils = require('./utils');
const cTable = require('console.table');

module.exports = function(callback) {

  _utils.getVariables(
    this._occ,
    function(error, items) {
      if (error) {
        callback(error);
      }

      if (items && items.length > 0) {
        var variables = items.map(function(variable) {
          return {
            ID: variable.id,
            Name: variable.name,
            Value: variable.value,
            'Date Created': new Date(variable.creationTime).toLocaleString(),
            'Date Modified': new Date(variable.modificationTime).toLocaleString()
          };
        });
        console.table(variables);
      } else {
        winston.info('No server-side extension varibles.');
      }

      callback();
    }
  );
};
