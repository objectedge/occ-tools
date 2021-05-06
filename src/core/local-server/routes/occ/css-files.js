const path = require('path');
const config = require('../../../config');

module.exports = (app, localServer) => {
  app.get('/file/*/css/:file(*)', async (req, res) => {
    return localServer.fileResponse(path.join(config.dir.transpiled, 'less', req.params.file), req, res);
  });
};

