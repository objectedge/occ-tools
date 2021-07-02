'use strict';

const { Octokit } = require("@octokit/rest");
const _config = require('../config');

const github = new Octokit({
  auth: _config.github.token,
  request : {
    timeout: 30000,
  }
});

var list = require('./list');
var listChangedFiles = require('./listChangedFiles');
var remoteContent = require('./remote-content');

module.exports = {
  list: function (options, callback) {
      list(github, options, callback);
  },
  content: function (options, callback) {
      remoteContent(github, options, callback);
  },
  listChangedFiles: listChangedFiles
};
