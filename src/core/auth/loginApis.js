var Auth = require('../auth');
var async = require('async');

var config = require('../config');
var authAdmin = new Auth('admin');
var authAdminUI = new Auth('adminUI');
var authAdminX = new Auth('adminX');
var authSearch = new Auth('search');

module.exports = function(callback) {
  var credentials = config.credentials;

  async.parallel([
    authAdmin.signIn.bind(authAdmin, credentials),
    authAdminUI.signIn.bind(authAdminUI, credentials),
    authAdminX.signIn.bind(authAdminX, credentials),
    authSearch.signIn.bind(authSearch, credentials),
  ], callback);
};
