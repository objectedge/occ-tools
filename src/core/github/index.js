'use strict';

const github = require('@octokit/rest')({
  timeout: 5000,
  debug: true
});

var login = require('./login');
var list = require('./list');
var listChangedFiles = require('./listChangedFiles');
var remoteContent = require('./remote-content');

module.exports = {
  list: function (options, callback) {
    login(github, function () {
      list(github, options, callback);
    }, options);
  },
  content: function (options, callback) {
    login(github, function () {
      remoteContent(github, options, callback);
    }, options);
  },
  listChangedFiles: listChangedFiles
};
