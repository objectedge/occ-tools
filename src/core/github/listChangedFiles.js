
var exec = require('child_process').exec;
var util = require('util');

var _config = require('../config');

module.exports = function(revision, head, callback) {
  exec(
    util.format('git diff-tree --no-commit-id --name-only -r %s..%s', revision, head || 'HEAD'),
    { cwd: _config.dir.project_base },
    function (error, stdout, stderr) {
      if(error || stderr) {
        callback(error || stderr);
      }

      var changedFiles = stdout.split('\n');
      callback(null, changedFiles);
    }
  );
};
