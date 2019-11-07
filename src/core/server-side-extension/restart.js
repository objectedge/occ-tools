var winston = require('winston');

module.exports = function(callback) {
  var self = this;

  winston.info('Restarting server-side extensions server...');
  var options = {
    api: 'servers/restart',
    method: 'post',
    body: { }
  };
  self._occ.request(options, function(error, body){
    self._occ.checkError(error, body, callback);

    callback();
  });
};
