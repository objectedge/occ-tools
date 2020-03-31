/**
 * routes/admin/ccstore/response/index.js
 *
 * @description: Index file for ccstore response. All routes with "/local-admin/api/ccstore/response" pass through here
 */

const fs = require('fs-extra');

module.exports = localServer => {
  const Router = require('express').Router();

  Router.route('/:id')
        .get(require('./get')(localServer))
        .post(require('./create')(localServer))
        .put(require('./update')(localServer))
        .delete(require('./delete')(localServer));

  Router.route('/')
        .get(require('./list')(localServer));

  return Router;
};
