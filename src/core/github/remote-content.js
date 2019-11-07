'use strict';

var _github;

function getRemoteContent(options, callback) {  
  var contentOptions = {
    owner: options.oraganization || 'intelimen',
    repo: options.repo || 'occ-components',
    path: options.remotePath
  };

  if (options.ref) {
    contentOptions.ref = options.ref;
  }

  _github.repos.getContent(contentOptions, callback);
}

module.exports = function (github, options, callback) {
  _github = github;
  getRemoteContent(options, callback);
};
