var Auth = require('../auth');
var async = require('async');

var credentials = require('../config').credentials;
var authAdmin = new Auth('admin');
var authAdminUI = new Auth('adminUI');
var authAdminX = new Auth('adminX');
var authSearch = new Auth('search');

module.exports = function(callback) {
  async.parallel([
    authAdmin.signIn.bind(authAdmin, credentials),
    authAdminUI.signIn.bind(authAdminUI, credentials),
    authAdminX.signIn.bind(authAdminX, credentials),
    authSearch.signIn.bind(authSearch, credentials),
  ], callback);
};
