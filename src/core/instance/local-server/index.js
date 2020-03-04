const fs = require('fs-extra');
const path = require('path');
const winston = require('winston');
const express = require('express');
const glob = require('glob');
const bodyParser = require('body-parser');
const config = require('../../config');

class LocalServer {
  run() {
    const app = express();
    const port = config.localServer.api.port;
  
    const customApiDir = config.dir.instanceDefinitions.customApi;
    const oracleApiDir = config.dir.instanceDefinitions.oracleApi;
    const schemaPath = path.join(oracleApiDir, 'schema.json');
    const customSchemaPath = path.join(customApiDir, 'schema.json');
    const customResponsesPath = path.join(customApiDir, 'responses');
    const mocksPath = config.dir.mocks;
  
    const schema = fs.readJsonSync(schemaPath, 'utf8');
    let customSchema;
  
    if (fs.existsSync(customSchemaPath)) {
      customSchema = fs.readJsonSync(customSchemaPath);
    }
  
    try {
      customResponses = fs.readdirSync(customResponsesPath);
    } catch(error) {
      console.log(`It was able to find any custom-response... using the default one`);
    }
  
    let schemaPaths = schema.paths;
    
    if(customSchema) {
      const customSchemaPaths = customSchema.paths;
      
      Object.keys(customSchemaPaths).forEach(customSchemaPath => {
        // just ignores the original schema path
        if(Object.keys(schemaPaths).includes(customSchemaPath)) {
          delete schemaPaths[customSchemaPath];
        }
  
        console.log(`Using custom schema path for ${customSchemaPath}...`);
      });
  
      schemaPaths = Object.assign(schemaPaths, customSchemaPaths);
    }
  
    app.use(bodyParser.json());
    app.use(bodyParser.text());
  
    // Disabling ETag because OCC tries to parse it and we don't have a valid value for this
    app.set('etag', false);
  
    for(const requestPath in schemaPaths) {
      for(const method in schemaPaths[requestPath]) {
        const requestData = schemaPaths[requestPath][method];
        let responsePath = path.join(oracleApiDir, requestData.responses);
        let customRequestsDefinitionPath;
        
        if(customSchema) {
          // Only replaces the response path if it contains a custom schema, otherwise just replace the response path
          if(Object.keys(customSchema.paths).includes(requestPath) && customResponses.includes(requestData.operationId)) {
            responsePath = path.join(customResponsesPath, requestData.operationId);
            console.log(`Using custom schema response for ${requestData.operationId}...`);
          } else if(!Object.keys(customSchema.paths).includes(requestPath) && customResponses.includes(requestData.operationId)) {
            customRequestsDefinitionPath = path.join(customResponsesPath, requestData.operationId);
          }
        }
        
        try {
          let requestsDefinition = glob.sync(path.join(responsePath, '**', 'descriptor.json'));
  
          // replace the response path by the custom response path
          if(customRequestsDefinitionPath) {
            const customRequestsDefinition = glob.sync(path.join(customRequestsDefinitionPath, '**', 'descriptor.json'));
            requestsDefinition = requestsDefinition.map(definitionPath => {
              const oracleLibsDirName = config.dir.instanceDefinitions.oracleLibsDirName;
              const customLibsDirName = config.dir.instanceDefinitions.customLibsDirName;
              const customDefinitionPathIndex = customRequestsDefinition.indexOf(definitionPath.replace(oracleLibsDirName, customLibsDirName));
  
              if(customDefinitionPathIndex > -1) {
                return customRequestsDefinition[customDefinitionPathIndex];
              }
  
              return definitionPath;
            });
  
            // adding new custom responses to request definitions
            customRequestsDefinition.forEach(itemPath => {
              if(!requestsDefinition.includes(itemPath)) {
                const indexOfDefaultdescriptor = requestsDefinition.indexOf(path.join(responsePath, 'default', 'descriptor.json'));
  
                // Don't keep the default response when we have custom response
                if(indexOfDefaultdescriptor > -1) {
                  requestsDefinition.splice(requestsDefinition[indexOfDefaultdescriptor], 1);
                }
  
                requestsDefinition.push(itemPath);
              }
            });
          }
  
          requestsDefinition.forEach(definitionPath => {
            let descriptor;
  
            try {
              descriptor = fs.readJsonSync(definitionPath);
            } catch(error) {
              console.log(`Warning: There is no valid descriptor for the request "${requestData.operationId}"`);
            }
  
            try {
              const responseDataPath = path.join(definitionPath, '..', descriptor.response.dataPath);
              const requestDefinition = descriptor.request;
              const responseDefinition = descriptor.response;
              let requestEndpoint = `${schema.basePath}${requestPath.replace('{id}', ':id').replace('{path: .*}', ':path')}`;
  
              if(requestDefinition.queryParameters) {
                Object.keys(requestDefinition.queryParameters).forEach(queryParamKey => {
                  if(/^:/.test(queryParamKey)) {
                    requestEndpoint = requestEndpoint.replace(queryParamKey, requestDefinition.queryParameters[queryParamKey]);
                    delete requestDefinition.queryParameters[queryParamKey]
                  }
                });
              }
  
              const checkEquality = (object1, object2) => {
                const optionsPropertyKey = '__options';
                const options = object1[optionsPropertyKey] || {};
                const matchType = options.matchType || 'string';
                const match = (object1Value, object2Value) => {
                  if(matchType === 'string') {
                    return object1Value.toString() === object2Value.toString();
                  }
  
                  return new RegExp(object1Value.toString()).test(object2Value.toString());
                };
  
                if(typeof object1 === 'string') {
                  return match(object1, object2);
                }
  
                const iterableObjectKeys = Object.keys(object2).filter(item => item !== optionsPropertyKey);
  
                return iterableObjectKeys.every(objectKey => {
                  const object1Value = object1[objectKey];
                  const object2Value = object2[objectKey];
  
                  if(typeof object2Value === 'undefined' || typeof object1Value === 'undefined') {
                    return false;
                  }
  
                  if(typeof object1Value === 'object' && typeof object2Value === 'object') {
                    return checkEquality(object1Value, object2Value);
                  }
  
                  return match(object1Value, object2Value);
                });
              };
  
              const middleware = (req, res, next) => {
                const queryParameters = requestDefinition.queryParameters;
                const headers = requestDefinition.headers;
                const hasQueryParameters = Object.keys(queryParameters).length;
                const hasHeaders = Object.keys(headers).length;
                const hasBody = Object.keys(requestDefinition.body).length; // Check with Object.keys even if it's an object
                const body = requestDefinition.body;
  
                if(!hasQueryParameters && !hasHeaders && !hasBody) {
                  return next();
                }
  
                let matches = [];
  
                if(hasQueryParameters) {
                  matches.push(checkEquality(queryParameters, req.query));
                }
  
                if(hasHeaders) {
                  matches.push(checkEquality(headers, req.headers));
                }
  
                if(hasBody) {
                  matches.push(checkEquality(body, req.body));
                }
  
                if(!matches.every(match => match)) {
                  return next('route');
                }
  
                next();
              };
              
              app[requestDefinition.method](`*${requestEndpoint}`, middleware, (req, res) => {
                res.header("OperationId", requestData.operationId);
  
                Object.keys(responseDefinition).forEach(requestOption => {
                  if(requestOption === 'headers') {
                    res.set(responseDefinition.headers);
                  }
  
                  if(requestOption === 'statusCode') {
                    res.status(responseDefinition.statusCode);
                  }
                });
  
                res.send(fs.readFileSync(responseDataPath, 'utf8'));
              });
            } catch(error) {
              console.log(`Warning: There is no valid response for the request "${requestData.operationId}"`);
            }
          });
        } catch(error) {
          console.log(error);
        }
      }
    }
  
    app.get('/mock', (req, res) => {
      const mockQueryParamPath = req.query.path;
  
      if(!mockQueryParamPath) {
        return res.json({ error: true, message: 'Please provide the "path" query param' });
      }
  
      const fullPathToMock = path.join(mocksPath, mockQueryParamPath);
      if (fs.existsSync(fullPathToMock)) {
        return res.json(fs.readJsonSync(fullPathToMock));
      }
  
      res.json({ error: true, message: `The mock "${fullPathToMock}" doesn't exist` });
    });
  
    app.get('/occ-app', function(req, res) {
      let htmlText = fs.readFileSync(path.join(__dirname + '/index.html'), 'utf8');
      htmlText = htmlText.replace(/\{\{occ-dev-server-configs\}\}/, JSON.stringify(config));
      htmlText = htmlText.replace(/\{\{occ-dev-server-custom-files\}\}/, JSON.stringify(glob.sync(path.join(config.dir.instanceDefinitions.customLibs, '**', '*.js'))));
      const requireJsPath = path.join(require.resolve('requirejs'), '..', '..', 'require.js');
      htmlText = htmlText.replace(/\{\{requireJsPath\}\}/, `${config.localServer.karma.urlRoot}/absolute${requireJsPath}`);
      htmlText = htmlText.replace(/\{\{mainJsPath\}\}/, `${config.localServer.karma.urlRoot}/absolute${config.dir.instanceDefinitions.customLibs}/main.js`);
      res.send(htmlText);
    });
  
    console.log('Starting api server...');
    
    return new Promise(() => {
      app.listen(port, () => {
        console.log(`Running api server on port ${port}`);
      });
    });
  }
}

module.exports = async function(action, options, callback) {
  const localServer = new LocalServer(options, this);

  try {
    switch(action) {
      case 'run':
        callback(null, await localServer.run());
        break;
      default:
        callback();
    }
  } catch(errorResponse) {
    winston.error(errorResponse);
    callback(errorResponse);
  }
};
