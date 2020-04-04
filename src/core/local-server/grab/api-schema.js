const fs = require('fs-extra');
const path = require('path');
const winston = require('winston');
const request = require('request');
const config = require('../../config');

const apiPath = config.dir.instanceDefinitions.oracleApi;
const responsesPath = path.join(apiPath, 'responses');
const webMIMETypes = fs.readJsonSync(path.join(__dirname, '..', 'static', 'webMIMETypes.json'));
const models = require('../database/models');

class ApiSchema {
  constructor(options, instance) {
    this.options = options;
    this.instanceOptions = instance.options;
    this.schemaURL = `${config.endpoints.dns}/ccstore/v1/metadata-catalog`;
    this.registryEndpoint = `${config.endpoints.dns}/ccstoreui/v1/registry`;
  }

  makeRequest(url) {
    winston.info(`Requesting ${url}...`);

    const requestConfigs = {
      url : url
    };

    return new Promise((resolve, reject) => {
      request(requestConfigs, (error, response, body) => {
        if(error) {
          return reject(error);
        }

        try {
          const parsedBody = JSON.parse(body);
          if(parsedBody.status === '404') {
            return reject(parsedBody);
          }
        } catch(error) {
          return reject(error);
        }

        resolve({ response: response, body: body });
      });
    });
  }

  grab() {
    return new Promise(async (resolve, reject) => {
      winston.info(`Requesting schema from ${this.schemaURL}...`);

      try {
        const schemaRequestResponse = await this.makeRequest(this.schemaURL);
        const registryRequestResponse = await this.makeRequest(this.registryEndpoint);

        const schemaJSON = JSON.parse(schemaRequestResponse.body);
        const registryJSON = JSON.parse(registryRequestResponse.body);
        const endpointMap = registryJSON.endpointMap;
        const schemaPaths = schemaJSON.paths;

        winston.info('Updating schema...');

        // Defining Server Side Extension endpoint
        endpointMap["serverSideExtension"] = {
          "method": "*",
          "responseType": "application/json",
          "url": "/ccstorex/custom/v1/:path(*)",
          "id": "serverSideExtension"
        }

        if(!/ui/.test(schemaJSON.basePath)) {
          schemaJSON.basePath = schemaJSON.basePath.replace('ccadmin', 'ccadminui').replace('ccstore', 'ccstoreui');
        }

        const operationsIds = [];

        for(const requestPathKey of Object.keys(schemaPaths)) {
          for(const method of Object.keys(schemaPaths[requestPathKey])) {
            operationsIds.push(schemaPaths[requestPathKey][method].operationId);
          }
        }

        // Setting missing endpoints(Not available in the metadata-catalog)
        for(const endpointMapKey of Object.keys(endpointMap)) {
          const endpointMapData = endpointMap[endpointMapKey];

          if(!operationsIds.includes(endpointMapKey)) {
            const method = endpointMapData.method.toLowerCase();
            let sampleResponse = {};
            let endpointMapResponse;

            try {
              if(method === 'get' && !/\{\}/.test(endpointMapData.url)) {
                endpointMapResponse = await this.makeRequest(`${config.endpoints.dns}${endpointMapData.url}`);
                sampleResponse = JSON.parse(endpointMapResponse.body);
              }
            } catch(error) {}

            schemaPaths[endpointMapData.url.replace('/ccstoreui/v1', '')] = {
              [method]: {
                description: '',
                summary: endpointMapData.id,
                operationId: endpointMapData.id,
                produces: [endpointMapData.responseType],
                responses: {
                  "200": {
                    "examples": {
                      [endpointMapData.responseType]: sampleResponse
                    }
                  }
                }
              }
            };
          }
        }

        // Setting paths
        for(let requestPathKey of Object.keys(schemaPaths)) {
          const requestPath = schemaPaths[requestPathKey];

          // Normalizing routes for express
          const value = schemaPaths[requestPathKey];
          delete schemaPaths[requestPathKey];
          requestPathKey = requestPathKey.replace(/\{\}/g, '*');
          requestPathKey = requestPathKey.replace(/\{(.+?):\s?\.\*\}/g, ':$1(*)');
          requestPathKey = requestPathKey.replace(/\{(.*)\}/g, ':$1');
          schemaPaths[requestPathKey] = value;

          const [ Schema ] = await models.Schema.findOrCreate({
            where: { path: requestPathKey },
            defaults: {
              path: requestPathKey,
              occEnvId: this.instanceOptions.occEnv.id
            },
            raw: true
          });

          for(const method of Object.keys(requestPath)) {
            const requestData = requestPath[method];
            const responses = requestData.responses;
            const requestId = requestData.operationId;
            const responseMethodPath = path.join(responsesPath, `${requestId}`);

            const [ MethodType ] = await models.MethodType.findOrCreate({
              where: { name: method },
              defaults: {
                name: method
              },
              raw: true
            });

            if(requestData.parameters) {
              requestData.parameters.forEach(parameter => {
                parameter.name = parameter.name.replace(': .*', '');
              });
            }

            for(const statusCode of Object.keys(responses)) {
              // Don't create structure for the default
              if(statusCode === 'default') {
                continue;
              }

              const responsePath = path.join(responseMethodPath, 'default');
              const dataDescriptorPath = path.join(responsePath, 'descriptor.json');
              const dataPath = path.join(responsePath, 'data.json');

              const descriptor = {
                allowedParameters: requestData.parameters || [],
                url: '',
                request: {
                  parameters: {
                    path: {},
                    query: {}
                  },
                  method,
                  headers: {},
                  body: {},
                  statusCode: "200"
                },
                response: {
                  dataPath: path.relative(responsePath, dataPath),
                  statusCode,
                  headers: {}
                },
                id: 'default',
                enabled: true,
                descriptorPath: dataDescriptorPath,
                responseDataPath: dataPath,
                operationId: requestId
              };

              if(!responses[statusCode].examples) {
                responses[statusCode].examples = {
                  "application/json": { sample: true }
                };
              }

              let contentTypeList = Object.keys(responses[statusCode].examples);
              const foundValidMIMEType = contentTypeList.some(mimeType => webMIMETypes.includes(mimeType));

              // If didn't find any valid mime type, consider it as application/json
              if(!foundValidMIMEType) {
                contentTypeList = ['application/json'];

                // If there is only one mime type and it's invalid, consider that as application/json
                if(Object.keys(responses[statusCode].examples).length === 1) {
                  responses[statusCode].examples = { [contentTypeList[0]]: Object.values(responses[statusCode].examples)[0] };

                  if(requestData.produces) {
                    requestData.produces = [contentTypeList[0]];
                  }
                }
              }

              let contentType = contentTypeList[0];
              let responseData = responses[statusCode].examples[contentType];

              if(responseData) {
                if(requestId === 'getRegistry') {
                  responseData = registryJSON;
                }

                descriptor.response.headers['content-type'] = contentType;
                let stringifiedResponseData = JSON.stringify(responseData, null, 2);

                if(stringifiedResponseData) {
                  stringifiedResponseData = stringifiedResponseData.replace(/https?:\/\/localhost:[0-9]+?\//g, config.endpoints.local);
                }

                requestData.responseData = stringifiedResponseData;
              } else {
                requestData.responseData = '{ "sample": true }';
              }

              requestData.descriptor = descriptor;
            }

            const [ Method ] = await models.Method.findOrCreate({
              where: { methodTypeId: MethodType.id, schemaId: Schema.id },
              defaults: {
                summary: requestData.summary,
                operationId: requestData.operationId,
                description: requestData.description || '',
                produces: requestData.produces ? requestData.produces[0] : 'application/json',
                methodTypeId: MethodType.id,
                schemaId: Schema.id
              },
              raw: true
            });

            const [ Descriptor ] = await models.Descriptor.findOrCreate({
              where: { methodTypeId: Method.id },
              defaults: {
                url: requestData.descriptor.url,
                enabled: 1,
                requestParameters: JSON.stringify(requestData.descriptor.request.parameters),
                requestStatusCode: requestData.descriptor.request.statusCode,
                requestHeaders: JSON.stringify(requestData.descriptor.request.headers),
                requestBody: JSON.stringify(requestData.descriptor.request.body),
                responseStatusCode: requestData.descriptor.response.statusCode,
                responseHeaders: JSON.stringify(requestData.descriptor.response.headers),
                methodTypeId: MethodType.id,
                methodId: Method.id
              },
              raw: true
            });

            await models.ResponseData.findOrCreate({
              where: { descriptiorId: Descriptor.id },
              defaults: {
                data: requestData.responseData,
                isDefault: 1,
                descriptiorId: Descriptor.id
              },
              raw: true
            });

            for(const allowedParameter of requestData.descriptor.allowedParameters) {
              await models.AllowedParameters.findOrCreate({
                where: { methodId: Method.id },
                defaults: {
                  in: allowedParameter.in,
                  name: allowedParameter.name,
                  description: allowedParameter.description,
                  type: allowedParameter.type || 'string',
                  required: allowedParameter.required || false,
                  methodId: Method.id
                },
                raw: true
              })
            }
          }
        }

        winston.info('Schema Updated!');
        resolve();
      } catch(error) {
        reject(error);
      }
    });
  }
}

module.exports = async function(action, options, callback) {
  const apiSchema = new ApiSchema(options, this);

  try {
    switch(action) {
      case 'grab':
        callback(null, await apiSchema.grab());
        break;
      default:
        callback();
    }
  } catch(errorResponse) {
    winston.error(errorResponse);
    callback(errorResponse);
  }
};
