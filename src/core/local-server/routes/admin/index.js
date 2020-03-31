/**
 * routes/admin/index.js
 *
 * @description: Index file for all admin routes. All routes with "/local-admin/api" pass through here
 */

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

  Router.use('/ccstore', require('./ccstore')(localServer));
  return Router;
};
