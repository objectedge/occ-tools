const path = require('path');
const fs = require('fs-extra');
const config = require('../../../config');

module.exports = (app, localServer) => {
  app.get(['/js/:asset(*)', '/shared/:asset(*)'], async (req, res) => {
    let oracleAssetsPath = path.join(config.dir.instanceDefinitions.oracleLibs, req.originalUrl);
    let customAssetsPath = path.join(config.dir.instanceDefinitions.customLibs, req.originalUrl);

    if(/main\.js/.test(req.params.asset)) {
      oracleAssetsPath = path.join(config.dir.instanceDefinitions.oracleLibs, 'main.js');
      customAssetsPath = path.join(config.dir.instanceDefinitions.customLibs, 'main.js');
    }

    try {
      if(fs.existsSync(customAssetsPath)) {
        return res.send(await fs.readFile(customAssetsPath));
      }

      if(fs.existsSync(oracleAssetsPath)) {
        return res.send(await fs.readFile(oracleAssetsPath));
      }

      res.status(404);
      res.send('File Not Found');
    } catch(error) {
      res.status(500);
      res.send(error);
    }
  });
};
