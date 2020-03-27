const path = require('path');
const fs = require('fs-extra');

module.exports = localServer => {
  const Router = require('express').Router();

  Router.get('/', (req, res) => {
    const routes = localServer.endpointsMapping.map(item =>  {
      item.id = `${item.requestData.operationId}-${item.id}`;
      return item;
    });

    res.sendResponse(routes);
  });

  Router.route('/request')
        .get(async (req, res) => {
          const routes = [];

          for(const item of localServer.endpointsMapping) {

            try {
              const descriptorPath = path.join(path.dirname(item.responseDataPath), 'descriptor.json');
              const descriptor = await fs.readJSON(descriptorPath);
              descriptor.url = `${localServer.localDomain}${descriptor.url}`;
              descriptor.id = `${item.requestData.operationId}-${descriptor.id}`;
              delete descriptor.allowedParameters;
              const route = { dataPath: item.responseDataPath, ...descriptor };

              routes.push(route);
            } catch(error) {
              res.status(500);
              return res.send(error);
            }
          }

          res.sendResponse(routes);
        })

  return Router;
};
