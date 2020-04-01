const winston = require('winston');
const fs = require('fs-extra');
const deepEqual = require('fast-deep-equal');
const helpers = require('../../helpers');

module.exports = (app, localServer) => {
  const endpointsMapping = localServer.endpointsMapping;

  const middleware = (endpointMappingPath, req, res, next) => {
    const methodMatches = mapping => ['*', 'use'].includes(mapping.method) ? true : req.method.toLowerCase() === mapping.method.toLowerCase();
    const isMappingMatching = mapping => mapping.path === endpointMappingPath && methodMatches(mapping) && mapping.enabled;
    const endpointsMappingPerPath = endpointsMapping.filter(isMappingMatching);

    let routeReqParams = {};

    // Workaround to set the sync argument in all endpoints
    if(req.query.syncRemote) {
      req.__syncRemote = req.query.syncRemote;
      delete req.query.syncRemote;
    }

    if(req.params) {
      Object.keys(req.params).forEach(param => {
        if(!/[\d+]/.test(param)) {
          routeReqParams[param] = req.params[param];
        }
      });
    }

    let foundMapping;
    const defaultMapping = endpointsMappingPerPath.find(mapping => mapping.id === 'default');
    const mappingsWithoutDetault = endpointsMappingPerPath.filter(mapping => mapping.id !== 'default');
    const validationRules = ['path', 'query', 'headers', 'body'];

    const isValidMapping = requestDefinitionParameters => {
      return validationRules.every(rule => {
        const definitionReqParameter = requestDefinitionParameters[rule];

        if(!definitionReqParameter) {
          return true;
        }

        const routeReqParameter = rule === 'path' ? routeReqParams : req[rule];
        return deepEqual(definitionReqParameter, routeReqParameter || {});
      });
    }

    for(const endpointMapping of mappingsWithoutDetault) {
      const requestDefinition = endpointMapping.requestDefinition;
      const requestDefinitionParameters = requestDefinition.parameters;

      // It's matching at least a simple route, without headers, body, path param or query string
      // so, it's a valid mapping already
      if(helpers.isEmptyObject(requestDefinition.headers) && helpers.isEmptyObject(requestDefinition.body)
      && helpers.isEmptyObject(requestDefinitionParameters.path) && helpers.isEmptyObject(requestDefinitionParameters.query)) {
        foundMapping = endpointMapping;
        break;
      }

      // if the rules are not matching, continue search for a valid mapping
      if(!isValidMapping(requestDefinitionParameters)) {
        continue;
      }

      // if it reached here, it's a valid mapping
      foundMapping = endpointMapping;
    }

    if(!foundMapping && !defaultMapping) {
      return next('route');
    }

    req.__endpointMapping = foundMapping ? foundMapping : defaultMapping;
    next();
  };

  for(const currentEndpointMapping of endpointsMapping) {
    const requestEndpoint = currentEndpointMapping.path;
    const requestDefinition = currentEndpointMapping.requestDefinition;

    // if it's *, then it can match any method
    if(requestDefinition.method === '*') {
      requestDefinition.method = 'use';
    }

    app[requestDefinition.method](requestEndpoint, middleware.bind(localServer, requestEndpoint), async (req, res) => {
      const endpointMapping = req.__endpointMapping;
      const requestData = endpointMapping.requestData;
      const responseDefinition = endpointMapping.responseDefinition;

      res.header("OperationId", requestData.operationId);
      res.header("ResponsePath", endpointMapping.responseDataPath);

      if(localServer.proxyAllApis) {
        return localServer.proxyRequest(req, res);
      }

      Object.keys(responseDefinition).forEach(requestOption => {
        if(requestOption === 'headers') {
          res.set(responseDefinition.headers);
        }

        if(requestOption === 'statusCode') {
          res.status(responseDefinition.statusCode);
        }
      });

      if(/\/css\//.test(req.originalUrl)) {
        res.type('css');
      }

      let content = '';

      try {
        content = await fs.readFile(endpointMapping.responseDataPath, 'utf8');
      } catch(error) {
        winston.error(`The following request was not synced :${req.originalUrl}`);
        winston.error("Reason: ", error);
        res.status(500);
        return res.send({ error });
      }

      // Sync local with remote
      if(req.__syncRemote || localServer.syncAllApiRequests || endpointMapping.id === 'default') {
        try {
          content = await localServer.syncStoreRequest(req, endpointMapping);
        } catch(error) {
          winston.error(`The following request was not synced :${req.originalUrl}`);
          winston.error("Reason: ", error.data);
          res.status(500);
          return res.send(error.data);
        }
      }

      if(/ccstoreui\/v1\/pages\/layout\//.test(req.originalUrl)) {
        try {
          content = await localServer.replaceLayoutContent(content);
        } catch(error) {
          winston.info(error);
          res.status(500);
          return res.send(error);
        }
      }

      res.send(content);
    });
  }
};

