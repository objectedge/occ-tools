const path = require('path');
const config = require('../../../config');

module.exports = (app, localServer) => {
  app.get('*general/:file(*)', async (req, res) => {
    return localServer.fileResponse(path.join(config.dir.project_root, 'files', 'general', req.params.file), req, res);
  });
};

