const fs = require('fs-extra');
const path = require('path');

module.exports = (app, localServer) => {
  app.use(async (req, res, next) => {
    try {
      let htmlText = await fs.readFile(path.join(localServer.serverPath, 'static', 'index.html'), 'utf8');
      const navState = {
        "referrer": "/",
        "statusCode": "200"
      };

      let pageNumber = req.originalUrl.match(/[0-9]+$/);
      if(pageNumber) {
        navState.pageNumber = pageNumber[0];
      }

      htmlText = htmlText.replace(/"\{\{ccNavState\}\}"/, JSON.stringify(navState));
      res.send(htmlText);
    } catch(error) {
      res.status(500);
      res.send(error);
    }
  });
};

