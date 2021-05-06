const path = require('path');
const fs = require('fs-extra');

module.exports = (app, localServer) => {
  app.get('/mock', (req, res) => {
    const mockQueryParamPath = req.query.path;

    if(!mockQueryParamPath) {
      return res.json({ error: true, message: 'Please provide the "path" query param' });
    }

    const fullPathToMock = path.join(localServer.mocksPath, mockQueryParamPath);
    if (fs.existsSync(fullPathToMock)) {
      return res.json(fs.readJsonSync(fullPathToMock));
    }

    res.json({ error: true, message: `The mock "${fullPathToMock}" doesn't exist` });
  });
};
