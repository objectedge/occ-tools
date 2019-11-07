var winston = require('winston');
const cTable = require('console.table');

module.exports = function(callback) {
  var self = this;
  winston.info('Requesting search index status');

  self._occ.request('/search/index', function(error, response) {
    if (error) {
      callback('Error retrieving the search index status.');
    }

    if (response.errorCode || response.error || parseInt(response.status) >= 400) {
      winston.error('[%s] %s', response.errorCode || response.status || '500', response.message);
      callback('Error retrieving the search index status.');
    }

    var job = response.indexingJob;
    if(job.startTime) {
      winston.info('Search index started on %s', new Date(job.startTime).toLocaleString());
    } else {
      winston.info('The search index has not started yet');
    }

    switch(job.indexingType) {
      case 'BASELINE_FULL_EXPORT':
        winston.info('Baseline Full Export search index');
        break;
      case 'BASELINE_PARTIAL_EXPORT':
        winston.info('Baseline search index');
        break;
      case 'PARTIAL':
        winston.info('Partial search index');
        break;
      default:
        winston.info('Undefined search index type');
        break;
    }

    var jobs = [];
    // Convert all search index phases to a table
    job.phases.forEach(function(phase) {
      phase.tasks.forEach(function(task) {
        jobs.push({
          Status: task.status,
          Phase: phase.phaseName,
          Path: task.indexablePath
        });
      });
    });

    console.table(jobs);

    if (job.finishTime) {
      winston.info('Search index finished on %s', new Date(job.finishTime).toLocaleString());
    }

    winston.info('Search index current status %s', job.status);
    callback();
  });
};
