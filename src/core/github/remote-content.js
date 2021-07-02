'use strict';

var _github;

function getRemoteContent(options, callback) {
  var contentOptions = {
    owner: options.oraganization || 'objectedge',
    repo: options.repo || 'occ-components',
    path: options.remotePath
  };

  if (options.ref) {
    contentOptions.ref = options.ref;
  }

  _github.repos.getContent(contentOptions)
    .then(content => callback(null, content))
    .catch(e => callback(e));
}

module.exports = function (github, options, callback) {
  _github = github;
  getRemoteContent(options, callback);
};
