module.exports = localServer => {
  const Router = require('express').Router();

  const middleware = (req, res, next) => {

  };

  Router
    .get('/', (req, res) => {
      const routes = localServer.endpointsMapping.map(item =>  {
        item.id = `${item.requestData.operationId}-${item.id}`;
        return item;
      });

      res.sendResponse(routes);
    });

  return Router;
};
