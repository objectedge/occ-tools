const path = require('path');
const occConfig = require('../config');

class InstancesConfig {
  constructor() {
    this.instanceId = occConfig.environment.details.url.match(/ccadmin-(.*?)\./);

    if(this.instanceId) {
      this.instanceId = this.instanceId[1];
    }

    this.definitionsBasePath = occConfig.dir.instanceDefinitions;
    this.definitionsPaths = {
      layouts: path.join(occConfig.dir.instanceDefinitions, this.instanceId, 'layouts')
    }
  }
}

module.exports = () => {
  return new InstancesConfig();
};
