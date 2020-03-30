const path = require('path');
const fs = require('fs-extra');
const filterResponse = require('../filterResponse');

module.exports = localServer => {
  const Router = require('express').Router();
  const getRequests = ({ id, includeDefault } = {}) => {
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
          descriptor.url = `${localServer.localDomain}${descriptor.url}`;
          descriptor.id = `${item.requestData.operationId}-${descriptor.id}`;
          delete descriptor.allowedParameters;

          const route = { responseDataPath: item.responseDataPath, ...descriptor };
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

  const getResponses = (req, id) => {
    return new Promise(async (resolve, reject) => {
      try {
        const requests = await getRequests();
        let routes = filterResponse(req, requests);
        const responses = [];

        if(id) {
          routes = routes.filter(route => route.id === id);
        }

        for(const route of routes) {
          responses.push({ id: route.id, data: await fs.readJSON(route.responseDataPath) });
        }

        resolve(responses);
      } catch(error) {
        reject(error);
      }
    });
  };

  const setRange = (req, res) => {
    if(!isNaN(req.range.first) && !isNaN(req.range.last) && !isNaN(req.range.length)) {
      res.range({
        first: req.range.first,
        last: req.range.last,
        length: req.range.length
      });
    }
  };

  Router.route('/request/:id')
        .get(async (req, res) => {
          try {
            const requests = await getRequests({ id: req.params.id });
            const response = filterResponse(req, requests);
            setRange(req, res);
            res.json(response);
          } catch(error) {
            res.status(500);
            res.json(error);
          }
        })
        .post(async (req, res) => {
          console.log('create');
          res.json({});
        })
        .put(async (req, res) => {
          console.log('update');
          res.json({});
        })
        .delete(async (req, res) => {
          console.log('delete');
          res.json({});
        });

  Router.route('/request')
        .get(async (req, res) => {
          try {
            const requests = await getRequests();
            const response = filterResponse(req, requests);
            setRange(req, res);
            res.json(response);
          } catch(error) {
            console.log(error);
            res.status(500);
            res.json(error);
          }
        });

  Router.route('/response/:id')
        .get(async (req, res) => {
          try {
            const response = await getResponses(req, req.params.id);
            setRange(req, res);
            res.json(response[0]);
          } catch(error) {
            res.status(500);
            res.json(error);
          }
        });

  Router.route('/response')
        .get(async (req, res) => {
          try {
            const response = await getResponses(req);
            setRange(req, res);
            res.json(response);
          } catch(error) {
            res.status(500);
            res.json(error);
          }
        });

  return Router;
};
