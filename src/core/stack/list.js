'use strict';

var path = require('path');
var winston = require('winston');
const cTable = require('console.table');
var fs = require('fs-extra');
var _config = require('../config');

/**
 * Sort the items alphabetically
 *
 * @param {Object} item1 item 1
 * @param {Object} item2 item 2
 * @returns if item 1 comes first item 2 alphabetically
 */
function sortAlphabetically(item1, item2) {
  if (item1['ID'] < item2['ID']) {
    return -1;
  } else if (item1['ID'] > item2['ID']) {
    return 1;
  } else {
    return 0;
  }
}


/**
 * Check if the stack is present locally
 *
 * @param {String} key the stack name 
 * @returns if the stack is downloaded
 */
function isDownloaded(key) {
  try {
    fs.lstatSync(path.join(_config.dir.project_root, 'stacks', key));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Convert a boolean to yes or no
 *
 * @param {Boolean} value the boolean value
 * @returns if true returns Yes, otherwise returns No
 */
function toYesOrNo(value) {
  if (value) {
    return 'Yes';
  }
  return 'No';
}

/**
 * List stack on OCC
 *
 * @param {Object} settings the command options
 * @param {Function} callback the callback function
 */
module.exports = function (settings, callback) {
  winston.info('Listing stacks');

  var options = {
    api: '/stacks',
    method: 'get'
  };

  var stacks = [];

  // list the stacks
  this._occ.request(options, function (error, response) {
    if (error) {
      callback('Error while listing the stacks');
    }

    //format the results
    response.items.forEach(function (stack) {
      stacks.push({
        ID: stack.id,
        Name: stack.name,
        Type: stack.descriptor.displayName,
        Downloaded: toYesOrNo(isDownloaded(stack.displayName))
      });
    });

    //print the results
    console.table(
      stacks.sort(sortAlphabetically)
    );

    callback();
  });
};
