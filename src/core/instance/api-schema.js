const fs = require('fs-extra');
const path = require('path');
const winston = require('winston');
const request = require('request');
const config = require('../config');

const apiPath = config.dir.instanceDefinitions.api;
const responsesPath = path.join(apiPath, 'responses');
const definitionsPath = path.join(apiPath, 'definitions');
const webMIMETypes = fs.readJsonSync(path.join(__dirname, 'webMIMETypes.json'));

const schemaPath = path.join(apiPath, 'schema.json');
const schemaURL = `${config.endpoints.baseUrl}/ccstore/v1/metadata-catalog`;

class ApiSchema {
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
      winston.info(`Requesting schema from ${schemaURL}...`);

      try {
        const schemaRequestResponse = await this.makeRequest(schemaURL);
        const schemaJSON = JSON.parse(schemaRequestResponse.body);
        const schemaPaths = schemaJSON.paths;

        winston.info('Updating schema...');

        if(!/ui/.test(schemaJSON.basePath)) {
          schemaJSON.basePath = schemaJSON.basePath.replace('ccadmin', 'ccadminui').replace('ccstore', 'ccstoreui');
        }

        // Setting paths
        for(const requestPathKey of Object.keys(schemaPaths)) {
          const requestPath = schemaPaths[requestPathKey];

          for(const method of Object.keys(requestPath)) {
            const requestData = requestPath[method];
            const responses = requestData.responses;
            const requestId = requestData.operationId;
            const responseMethodPath = path.join(responsesPath, `${requestId}`);

            fs.ensureDirSync(responseMethodPath);

            for(const statusCode of Object.keys(responses)) {
              // Don't create structure for the default
              if(statusCode === 'default') {
                continue;
              }

              const responsePath = path.join(responseMethodPath, 'default');
              const dataDescriptorPath = path.join(responsePath, 'descriptor.json');
              const dataPath = path.join(responsePath, 'data.json');

              const descriptor = {
                allowedParameters: requestData.parameters,
                request: {
                  queryParameters: {},
                  method,
                  headers: {},
                  body: {}
                },
                response: {
                  dataPath: path.relative(responsePath, dataPath),
                  statusCode,
                  headers: {}
                }
              };

              await fs.ensureDir(responsePath);

              if(responses[statusCode].examples) {
                let contentTypeList = Object.keys(responses[statusCode].examples);
                const foundValidMIMEType = contentTypeList.some(mimeType => webMIMETypes.includes(mimeType));

                // If didn't find any valid mime type, consider it as application/json
                if(!foundValidMIMEType) {
                  contentTypeList = ['application/json'];
                }

                let contentType = contentTypeList[0];
                const responseData = responses[statusCode].examples[contentType];

                if(responseData) {
                  descriptor.response.headers['content-type'] = contentType;
                  let stringifiedResponseData = JSON.stringify(responseData, null, 2);

                  if(stringifiedResponseData) {
                    // stringifiedResponseData = stringifiedResponseData.replace(/localhost:[0-9]+?\//g, `localhost:${configs.server.karma.port}/`).replace(/"httpPort":\s[0-9]+?,/g, `"httpPort": ${configs.server.karma.port},`);
                  }

                  await fs.outputJSON(dataPath, JSON.parse(stringifiedResponseData), { spaces: 2 });
                }
              }

              await fs.outputJSON(dataDescriptorPath, descriptor, { spaces: 2 });
            }

            requestData.responses = path.relative(apiPath, responseMethodPath);
          }
        }

        // Setting Definitions
        for(const schemaDefinitionPath of Object.keys(schemaJSON.definitions)) {
          const definitionPath = path.join(definitionsPath, `${schemaDefinitionPath}.json`);
          await fs.outputJSON(definitionPath, schemaJSON.definitions[schemaDefinitionPath], { spaces: 2 });
        }
        delete schemaJSON.definitions;

        await fs.outputJSON(schemaPath, schemaJSON, { spaces: 2 });
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
