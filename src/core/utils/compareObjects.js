const deepEqual = require('fast-deep-equal');

module.exports = (localProperty, remoteProperty) => {
  return deepEqual(localProperty , remoteProperty);
};
