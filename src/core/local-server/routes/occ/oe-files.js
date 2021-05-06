const path = require('path');
const config = require('../../../config');

module.exports = (app, localServer) => {
  app.get('/oe-files/:file(*)', async (req, res) => {
    return localServer.fileResponse(path.join(config.dir.project_root, 'files', '**', req.params.file), req, res);
  });
};
