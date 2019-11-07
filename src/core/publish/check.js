'use strict';
var winston = require('winston');
const cTable = require('console.table');

module.exports = function(callback) {
  var self = this;

  winston.info('Requesting publish status');
  self._occ.request('/publish?lastPublished=true', function(error, response) {
    if (error) callback('Error retrieving the publish status.');
    
    var jobs = [];
    jobs.push({
      Author: response.firstName + ' ' + response.lastName,
      Running: response.publishRunning ? 'Yes' : 'No',
      'Last Published':  new Date(response.lastPublished).toLocaleString()
    });

    console.table(jobs);
    callback();
  });
};
