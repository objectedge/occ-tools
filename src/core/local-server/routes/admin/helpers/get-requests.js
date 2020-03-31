const fs = require('fs-extra');
const path = require('path');

module.exports = (localServer, { id, includeDefault } = {}) => {
  return new Promise(async (resolve, reject) => {
    let endpointsMapping = localServer.endpointsMapping;
    const routes = [];

    if(!includeDefault) {
      endpointsMapping = endpointsMapping.filter(item => item.id !== 'default')
    }

    for(const item of endpointsMapping) {
      try {
        const descriptorPath = path.join(path.dirname(item.responseDataPath), 'descriptor.json');
        const descriptor = await fs.readJSON(descriptorPath);
        delete descriptor.allowedParameters;
        const route = { descriptorPath, responseDataPath: item.responseDataPath, ...descriptor };
        route.operationId = item.requestData.operationId;

        // Get By Id
        if(id && id === descriptor.id) {
          return resolve(route);
        }

        routes.push(route);
      } catch(error) {
        return reject(error);
      }
    }

    resolve(routes);
  });
};
