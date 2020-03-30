module.exports = localServer => {
  const Router = require('express').Router();
  const range = require('express-range');
  const cors = require('cors');

  Router.use(cors({
    exposedHeaders: 'Content-Range'
  }));

  Router.use(range({
    accept: 'items'
  }));

  Router.use('/widget', require('./widget')(localServer));
  Router.use('/ccstore', require('./ccstore')(localServer));
  return Router;
};
