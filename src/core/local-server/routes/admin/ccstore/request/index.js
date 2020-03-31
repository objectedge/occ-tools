/**
 * routes/admin/ccstore/request/index.js
 *
 * @description: Index file for ccstore request. All routes with "/local-admin/api/ccstore/request" pass through here
 */

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
