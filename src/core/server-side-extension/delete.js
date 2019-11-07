var winston = require('winston');
var util = require('util');

module.exports = function(name, callback) {
  var self = this;

  winston.info('Deleting server-side extension %s...', name);
  var options = {
    'api': '/serverExtensions/deleteFiles',
    'method': 'post',
    'body': {
      'paths': [ util.format('%s.zip', name) ]
    }
  };
  self._occ.request(options, function(error, body){
    self._occ.checkError(error, body, callback);

    callback();
  });
};
