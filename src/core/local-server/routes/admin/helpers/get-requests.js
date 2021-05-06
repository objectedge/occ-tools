const fs = require('fs-extra');
const path = require('path');

module.exports = (localServer, { ids, includeDefault } = {}) => {
  return new Promise(async (resolve, reject) => {
    let endpointsMapping = localServer.endpointsMapping;
    const routes = [];

    if(!includeDefault) {
      endpointsMapping = endpointsMapping.filter(item => item.id !== 'default')
    }

    if(ids) {
      endpointsMapping = endpointsMapping.filter(item => ids.includes(item.id));
    }

    for(const item of endpointsMapping) {
      try {
        const descriptorPath = path.join(path.dirname(item.responseDataPath), 'descriptor.json');
        const descriptor = await fs.readJSON(descriptorPath);
        const route = { ...descriptor };
        routes.push(route);
      } catch(error) {
        return reject(error);
      }
    }

    resolve(routes);
  });
};
