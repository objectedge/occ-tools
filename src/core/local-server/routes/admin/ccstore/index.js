/**
 * routes/admin/ccstore/index.js
 *
 * @description: Index file for ccstore routes
 */

module.exports = localServer => {
  const Router = require('express').Router();

  Router.use('/request', require('./request')(localServer));
  Router.use('/response', require('./response')(localServer));

  return Router;
};
