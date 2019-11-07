var async = require('async');
var winston = require('winston');

module.exports = function(type, callback) {
  var self = this;

  /**
  * Search status to be considered as not final
  */
  var processingStatuses = [ 'RUNNING', 'PENDING', 'CLEANING' ];

  /**
  * Log the completed phases of search.
  * @param  {Object} indexingJob The search status response
  * @param  {Array} completedTasks The list of already completed tasks
  */
  var logCompletedPhases = function(indexingJob, completedTasks) {
    indexingJob.phases.forEach( function(phase) {
      phase.tasks.forEach( function(task) {
        if (task.status === 'COMPLETE' && !completedTasks.includes(task.indexablePath)) {
          completedTasks.push(task.indexablePath);
          winston.info('Completed phase %s:%s', phase.phaseName, task.indexablePath);
        }
        if (task.status !== 'COMPLETE') {
          return;
        }
      });
    });
  };

  /**
  * Get the search status until the search is not finished.
  * @param  {Object} callback The callback
  * @param  {Array} completedTasks The list of already completed tasks
  */
  var getSearchStatus = function(callback, completedTasks) {
    self._occ.request('/search/index', function(error, response) {
      if (error) {
        callback('Error retrieving the search index status.');
      }

      if (response.errorCode || response.error || parseInt(response.status) >= 400) {
        winston.error('[%s] %s', response.errorCode || response.status || '500', response.message);
        callback('Error retrieving the search index status.');
      }

      logCompletedPhases(response.indexingJob, completedTasks);
      if (processingStatuses.includes(response.indexingJob.status)) {
        getSearchStatus(callback, completedTasks);
      } else {
        winston.info('Search index completed with status %s', response.indexingJob.status);
        callback();
      }
    });
  };

  async.waterfall([
    /**
    * Trigger the search index on OCC.
    * @param  {Object} callback The callback
    */
    function(callback) {
      winston.info('Triggering %s search index', type);
      var options = {
        'api': '/search/index',
        'method': 'post',
        'body': {
          'op': type
        }
      };
      self._occ.request(options, function(error, response) {
        if (error) {
          callback('Error while triggering the search index');
        }

        if (response.errorCode || response.error || parseInt(response.status) >= 400) {
          winston.error('[%s] %s', response.errorCode || response.status || '500', response.message);
          callback('Error while triggering the search index');
        }

        if (response.executionStarted) {
          // if the search was started right away, the live status will be displayed on console
          winston.info('The search index has been started');
          getSearchStatus(callback, []);
        } else if (response.queued) {
          // if the search was scheduled, the command ends
          winston.info('The search index was succesfully scheduled to run');
          callback();
        }
      });
    }
  ], callback);
};
