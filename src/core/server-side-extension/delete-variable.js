var winston = require('winston');
var util = require('util');
var async = require('async');
var _utils = require('./utils');

module.exports = function(name, callback) {
  var self = this;

  async.waterfall(
    [
      function(callback) {
        _utils.getVariables(
          self._occ,
          function(error, items) {
            if (error) {
              callback(error);
            }

            var variable = items.filter(function(v) {
              return v.id === name || v.name === name;
            });

            if (variable && variable.length) {
              callback(null, variable);
            } else {
              callback('No server-side extension variables found.');
            }
          }
        );
      },
      function(variable, callback) {
        winston.info('Deleting server-side extension variable %s...', variable[0].name);
        async.each(variable,
          function(v, callback){
            var options = {
              'api': util.format('/extensionEnvironmentVariables/%s', v.id),
              'method': 'delete',
              'body': { }
            };
            self._occ.request(options, function(error, body){
              self._occ.checkError(error, body, callback);

              winston.info('Server-side extension variable %s deleted', v.id);
              callback();
            });
          },
          callback
        );

      }
    ],
    callback
  );
};
