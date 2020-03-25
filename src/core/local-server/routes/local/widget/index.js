module.exports = localServer => {
  const Router = require('express').Router();

  Router
    .get('/', (req, res) => {
      res.send(localServer.localFiles);
    });

  return Router;
};
