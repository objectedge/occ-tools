const arrayToMap = require('./arrayToMap');
const compareObjects = require('./compareObjects');
const constants = require('./constants');
const readJsonFile = require('./readJsonFile');

module.exports = {
  arrayToMap,
  arrayToMapById: (array) => arrayToMap(array, constants.ID_PROPERTY),
  compareObjects,
  constants,
  readJsonFile
};
