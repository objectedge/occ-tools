const fs = require('fs-extra');
const path = require('path');
const winston = require('winston');
const https = require('https');
const express = require('express');
const request = require('request');
const glob = require('glob');
const bodyParser = require('body-parser');
const hostile = require('hostile');
const url = require('url');
const exitHook = require("async-exit-hook");
const jsesc = require('jsesc');
const config = require('../../config');
const devcert = require('devcert');
const Bundler = require('../../bundler');
const HostsManager = require('./hosts-manager');
const endpointsMapping = [];

class LocalServer {
  constructor(options, instance) {
    this.options = options;
    this.instanceOptions = instance.options;
    this.domain = this.instanceOptions.domain;
    this.localDomain = this.domain.replace(/:\/\//, '://local.');
    this.hostname = url.parse(this.domain).hostname;
    this.localHostname = url.parse(this.localDomain).hostname;
    this.hostsManager = new HostsManager({ hostname: this.localHostname, ip: '127.0.0.1' });
    this.syncAllApiRequests = false;
    this.proxyAllApis = false;

    this.bundler = new Bundler({
      source: '/js',
      debug: true,
      dest: '/js',
      watch: true,
      polling: false,
      sourceMapType: '#eval-source-map',
      widgets: false,
      appLevel: true
    });
  }

  bundleJS() {
    return new Promise((resolve, reject) => {
      let resolved = false;
      winston.info('[bundler:compile] Bundling javascript files..');

      this.bundler.on('complete', async stats => {
        winston.info('\n\n')
        winston.info('[bundler:compile] Changes ----- %s ----- \n', new Date());
        winston.info('[bundler:compile] %s', stats.toString('minimal'));

        if(!resolved) {
          setTimeout(() => {
            resolve();
            resolved = true;
          }, 1000);
        }
      })
      this.bundler.on('error', error => {
        winston.error('[bundler:error]', error);
        reject(error);
      });

      this.bundler.compile();
    });
  }

  bundleFiles() {
    return new Promise(async (resolve, reject) => {
      winston.info('[bundler:compile] Bundling files..');

      try {
        await this.bundleJS();
        resolve();
      } catch(error) {
        reject(error);
      }
    });
  }

  setHosts(log = false) {
    return new Promise(async (resolve, reject) => {
      if(!this.options.updateHosts) {
        return resolve();
      }

      try {
        await this.hostsManager.setHosts(log);
        resolve();
      } catch(error) {
        return reject(error);
      }
    });
  }

  unsetHosts(log = false) {
    return new Promise(async (resolve, reject) => {
      if(!this.options.updateHosts) {
        return resolve();
      }

      try {
        await this.hostsManager.unsetHosts(log);
        resolve();
      } catch(error) {
        return reject(error);
      }
    });
  }

  async transpiledJsResponse(type, req, res) {
    const fileName = path.basename(req.params.file);

    try {
      const foundFile = glob.sync(path.join(config.dir.project_root, '.occ-transpiled', type, '**', fileName));

      if(foundFile.length) {
        res.type('js');
        return res.send(await fs.readFile(foundFile[0]));
      }

      return this.proxyRequest(req, res, req.originalUrl);
    } catch(error) {
      res.status(500);
      res.send(error);
    }
  }

  async templateResponse(req, res) {
    let widgetName = req.params.widgetName;

    try {
      const foundFile = glob.sync(path.join(config.dir.project_root, 'widgets', '**', widgetName, 'templates', 'display.template'));

      if(foundFile.length) {
        return res.send(await fs.readFile(foundFile[0]));
      }

      return this.proxyRequest(req, res, req.originalUrl);
    } catch(error) {
      console.log(error);
      res.status(500);
      res.send(error);
    }
  }

  async proxyRequest(req, res, originalPath) {
    try {
      const url = `${this.domain}/${originalPath}`;

      req.pipe(request(url, { rejectUnauthorized: false }).on('response', async response => {
        const setCookiesHeader = response.headers['set-cookie'];

        // Encodes any unicode character
        // This comes from Incapsula
        if (setCookiesHeader && Array.isArray(setCookiesHeader)) {
          response.headers['set-cookie'] = setCookiesHeader.map(cookie =>
            jsesc(cookie)
          );
        }
      })).pipe(res);
    } catch(error) {
      res.status(500);
      res.send(error);
    }
  }

  async run() {
    try {
      await this.bundleFiles();

      if(this.options.updateHosts) {
        winston.info('');
        winston.info(`You can be asked for your root password! We need this to change your hosts file`);
        winston.info(`If you want to set the hosts manually, please use the option --updateHosts=false`);
        winston.info('');
      }

      await this.setHosts(true);
      winston.info(`Hosts set!`);
    } catch(error) {
      winston.error(error);
    }

    const ssl = await devcert.certificateFor(this.localHostname, { skipHostsFile: true });
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
      winston.info(`It was not able to find any custom-response... using the default one`);
    }

    let schemaPaths = schema.paths;

    if(customSchema) {
      const customSchemaPaths = customSchema.paths;

      Object.keys(customSchemaPaths).forEach(customSchemaPath => {
        // just ignores the original schema path
        if(Object.keys(schemaPaths).includes(customSchemaPath)) {
          delete schemaPaths[customSchemaPath];
        }

        winston.info(`Using custom schema path for ${customSchemaPath}...`);
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
            winston.info(`Using custom schema response for ${requestData.operationId}...`);
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
              winston.info(`Warning: There is no valid descriptor for the request "${requestData.operationId}"`);
            }

            try {
              const responseDataPath = path.join(definitionPath, '..', descriptor.response.dataPath);
              const requestDefinition = descriptor.request;
              const responseDefinition = descriptor.response;
              let requestEndpoint = `${schema.basePath}${requestPath.replace('{id}', ':id').replace('{path: .*}', ':path').replace('{}', ':path').replace('{bundle}', ':bundle')}`;

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

                // Workaround to set the sync argument in all endpoints
                if(req.query.syncRemote) {
                  req.__syncRemote = req.query.syncRemote;
                  delete req.query.syncRemote;
                }

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

              if(/:id|:path/.test(requestEndpoint)) {
                return;
              }

              endpointsMapping.push({
                method: requestDefinition.method,
                path: `*${requestEndpoint}`,
                data: requestData
              });

              app[requestDefinition.method](`*${requestEndpoint}`, middleware, async (req, res) => {
                res.header("OperationId", requestData.operationId);

                if(this.proxyAllApis) {
                  return this.proxyRequest(req, res, req.originalUrl);
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

                const syncArgument = req.__syncRemote;
                if(syncArgument || this.syncAllApiRequests) {
                  if(syncArgument) {
                    delete req.__syncRemote;
                  }

                  const requestOptions = {
                    rejectUnauthorized: false,
                    gzip: true
                  };

                  const remoteUrl = `${this.domain}/${req.originalUrl}`;

                  req.pipe(request(remoteUrl, requestOptions, async (error, response, body) => {
                    if(error) {
                      res.status(500);
                      res.send(error.message);
                      return;
                    }

                    const rawBody = body.replace(new RegExp(this.domain, 'g'), this.localDomain);
                    let content;

                    try {
                      if(/\/pages\/css/.test(req.originalUrl)) {
                        content = rawBody;
                        await fs.outputFile(responseDataPath, content);
                      } else {
                        content = JSON.parse(rawBody);
                        await fs.outputJSON(responseDataPath, content, { spaces: 2 });
                      }

                      winston.info(`Synced: ${remoteUrl.replace(/[?&]syncRemote=true/, '')}`);

                      res.send(content);
                    } catch(error) {
                      res.status(500);
                      res.send(error.message);
                    }
                  }))

                  return;
                }

                // Otherwise just send the local response data
                res.send(await fs.readFile(responseDataPath, 'utf8'));
              });
            } catch(error) {
              winston.info(`Warning: There is no valid response for the request "${requestData.operationId}"`);
            }
          });
        } catch(error) {
          winston.info(error);
        }
      }
    }

    app.get('/sync-all-apis/:status', async (req, res) => {
      this.syncAllApiRequests = req.params.status === 'true';
      res.json({ syncingRequests: this.syncAllApiRequests });
    });

    app.get('/proxy-all-apis/:status', async (req, res) => {
      this.proxyAllApis = req.params.status === 'true';
      res.json({ proxyAllApis: this.proxyAllApis });
    });

    app.get('/occ-server-details', (req, res) => {
      res.json(endpointsMapping);
    });

    app.use('/proxy/:path(*)', (req, res) => {
      this.proxyRequest(req, res, req.params.path);
    });

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

    app.get(['/js/:asset(*)', '/shared/:asset(*)'], async (req, res) => {
      let oracleAssetsPath = path.join(config.dir.instanceDefinitions.oracleLibs, req.originalUrl);
      let customAssetsPath = path.join(config.dir.instanceDefinitions.customLibs, req.originalUrl);

      if(/main\.js/.test(req.params.asset)) {
        oracleAssetsPath = path.join(config.dir.instanceDefinitions.oracleLibs, 'main.js');
        customAssetsPath = path.join(config.dir.instanceDefinitions.customLibs, 'main.js');
      }

      try {
        if(fs.existsSync(customAssetsPath)) {
          return res.send(await fs.readFile(customAssetsPath));
        }

        if(fs.existsSync(oracleAssetsPath)) {
          return res.send(await fs.readFile(oracleAssetsPath));
        }

        res.status(404);
        res.send('File Not Found');
      } catch(error) {
        res.status(500);
        res.send(error);
      }
    });

    app.get('/oe-files/:file(*)', async (req, res) => {
      const fileName = path.basename(req.params.file);

      try {
        const foundFile = glob.sync(path.join(config.dir.project_root, 'files', '**', fileName));

        if(foundFile.length) {
          return res.send(await fs.readFile(foundFile[0]));
        }

        res.status(404);
        res.send('File Not Found');
      } catch(error) {
        res.status(500);
        res.send(error);
      }
    });

    app.get('/file/*/global/:file(*.js)', this.transpiledJsResponse.bind(this, 'app-level'));
    // app.get('/file/*/widget/:file(*.js)', this.transpiledJsResponse.bind(this, 'widgets'));
    // app.get('/file/*/widget/:version?/:widgetName/*/*', this.templateResponse.bind(this));

    app.get('*general/:file(*)', async (req, res) => {
      const fileName = path.basename(req.params.file);

      try {
        const foundFile = glob.sync(path.join(config.dir.project_root, 'files', 'general', fileName));

        if(foundFile.length) {
          return res.send(await fs.readFile(foundFile[0]));
        }

        return this.proxyRequest(req, res, req.originalUrl);
      } catch(error) {
        res.status(500);
        res.send(error);
      }
    });

    app.use(async (req, res) => {
      if(/(\/file\/general)/.test(req.originalUrl)) {
        return this.proxyRequest(req, res, req.originalUrl);
      }

      try {
        let htmlText = await fs.readFile(path.join(__dirname + '/index.html'), 'utf8');
        res.send(htmlText);
      } catch(error) {
        res.status(500);
        res.send(error);
      }
    });

    winston.info('Starting api server...');

    return new Promise(() => {
      const server = https.createServer(ssl, app).listen(port, () => {
        winston.info(`Running api server on port ${port}`);
      });

      exitHook(callback => {
        winston.info('Closing http server.');
        server.close(async () => {
          try {
            await this.unsetHosts(true);
          } catch(error) {
            winston.error(error);
          }

          winston.info('Done!')
          callback();
        });
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
