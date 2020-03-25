module.exports = localServer => {
  const Router = require('express').Router();

  Router.use('/widget', require('./widget')(localServer));
  Router.use('/occ', require('./occ-api')(localServer));
  return Router;
};
