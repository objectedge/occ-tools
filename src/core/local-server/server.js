const util = require('util');
const fs = require('fs-extra');
const path = require('path');
const winston = require('winston');
const https = require('https');
const express = require('express');
const request = require('request');
const glob = util.promisify(require('glob'));
const bodyParser = require('body-parser');
const urlParser = require('url');
const mime = require('mime');
const url = require('url');
const exitHook = require("async-exit-hook");
const jsesc = require('jsesc');
const config = require('../config');
const devcert = require('devcert');
const grabApiSchema = require('./grab/api-schema');
const grabLibraries = require('./grab/libraries');
const Transpiler = require('./transpiler');
const HostsManager = require('./hosts-manager');
const helpers = require('./helpers');
const uniqid = require('uniqid');
const multiparty = require('multiparty');

class LocalServer {
  constructor(options, instance) {
    this.options = options;
    this.commandInstance = instance;
    this.instanceOptions = instance.options;
    this.domain = config.endpoints.dns;
    this.localDomain = config.endpoints.local;
    this.hostname = url.parse(this.domain).hostname;
    this.localHostname = url.parse(this.localDomain).hostname;
    this.serverPath = __dirname;
    this.endpointsMapping = [];
    this.hostsManager = new HostsManager({ hostname: this.localHostname, ip: '127.0.0.1' });
    this.syncAllApiRequests = false;
    this.proxyAllApis = false;
    this.localFiles = {};
    this.transpiler = new Transpiler({
      serverOptions: options,
      instanceOptions: this.instanceOptions,
      localFiles: this.localFiles
    });
  }

  setLocalFiles() {
    return new Promise(async (resolve, reject) => {
      const excludeFilesList = ['.md', '.js', '.properties', '.yml', 'motorola-scripts', 'libraries', 'tests', 'mocks'];
      const exclude = filePath => !excludeFilesList.some(file => filePath.includes(file));

      try {
        const storefrontPaths = (await glob(path.join(config.dir.project_root, '*'))).filter(exclude);

        for(const storefrontPath of storefrontPaths) {
          const baseName = path.basename(storefrontPath);
          const localFiles = (await glob(path.join(config.dir.project_root, baseName, '**'))).filter(file => fs.lstatSync(file).isFile() && !/\.zip/.test(file));
          this.localFiles[baseName] = {};

          for(const localFile of localFiles) {
            const relativeLocalPath = path.relative(storefrontPath, localFile);
            const name = relativeLocalPath.split(path.sep)[baseName === 'widgets' ? 1 : 0];
            this.localFiles[baseName][name] = this.localFiles[baseName][name] || [];
            this.localFiles[baseName][name].push(localFile);
          }
        }

        resolve();
      } catch(error) {
        reject(error);
      }
    });
  }

  getLocalWidgetsFromRegions(regions) {
    const widgets = [];
    const localWidgets = Object.keys(this.localFiles.widgets);

    if(Array.isArray(regions)) {
      regions.forEach(function iterateOverRegion(region) {
        if(Array.isArray(region.regions)) {
          return region.regions.forEach(iterateOverRegion.bind(this));
        }

        if(!region.widgets) {
          return;
        }

        region.widgets.forEach(widget => {
            let localPaths = [];

            for(const localWidget of localWidgets) {
              const widgetType = widget.typeId.replace(/_v.*$/, '');
              widget.typeIdWithoutVersion = widgetType;

              if(widgetType === localWidget) {
                localPaths = this.localFiles.widgets[localWidget];
                break;
              }
            }

            widgets.push({ regionId: region.id, data: widget, localPaths });
          }
        )
      }.bind(this));
    }

    return widgets;
  }

  replaceTemplateSrc(contentJson) {
    return new Promise(async (resolve, reject) => {
      try {
        const regions = contentJson.regions;
        const widgets = this.getLocalWidgetsFromRegions(regions).filter(widget => widget.localPaths.length);

        for(const widget of widgets) {
          const templatePath = widget.localPaths.find(filePath => filePath.includes('display.template'));
          const elementsPath = widget.localPaths.filter(filePath => /element.*templates/.test(filePath));

          if(templatePath) {
            // Setting template src
            widget.data.templateSrc = await fs.readFile(templatePath, 'utf8');
          }

          if(elementsPath.length && widget.data.elementsSrc) {
            let elementsSrc = '';
            for(const elementPath of elementsPath) {
              const elementName = elementPath.split(path.sep).reverse()[2];
              const elementContent = await fs.readFile(elementPath, 'utf8');
              elementsSrc += `<script type="text/html" id="${widget.data.typeId}-${elementName}">${elementContent}</script>`;
            }

            // Setting elements src
            widget.data.elementsSrc = elementsSrc;
          }
        }

        resolve(JSON.stringify(contentJson));
      } catch(error) {
        reject(error);
      }
    });
  }

  replaceLayoutContent(content) {
    let newContent = '';

    return new Promise(async (resolve, reject) => {
      try {
        const contentJson = JSON.parse(content);
        newContent = await this.replaceTemplateSrc(contentJson);
        resolve(newContent);
      } catch(error) {
        reject(error);
      }
    });
  }

  async templateResponse(req, res) {
    let widgetName = req.params.widgetName;
    let fileName = req.params.file;

    try {
      const foundFile = glob.sync(path.join(config.dir.project_root, 'widgets', '**', widgetName, 'templates', fileName));

      if(foundFile.length) {
        let type = mime.getType(foundFile);

        if(/\.template/.test(foundFile)) {
          type = 'text/html';
        }

        // Try to set the content-type, if it's not possible, then use the request one
        if(type) {
          res.type(type);
        } else if(req.get('Content-Type')) {
          res.type(req.get('Content-Type'));
        }

        return res.send(await fs.readFile(foundFile[0]));
      }

      return this.proxyRequest(req, res, req.originalUrl);
    } catch(error) {
      winston.error(error);
      res.status(500);
      res.send(error);
    }
  }

  syncStoreRequest(req, endpointMapping) {
    const responseDataPath = endpointMapping.responseDataPath;

    return new Promise(async (resolve, reject) => {
      if(req.__syncRemote) {
        delete req.__syncRemote;
      }

      const remoteUrl = `${this.domain}/${req.originalUrl}`;
      let headers = JSON.stringify({...req.headers});
      headers = JSON.parse(headers.replace(new RegExp(this.localHostname, 'g'), this.hostname));
      delete headers['content-length'];

      const requestOptions = {
        uri: remoteUrl,
        rejectUnauthorized: false,
        gzip: true,
        method: req.method,
        headers
      };

      const isForm = req.is('urlencoded') || req.is('multipart');

      if(!isForm && ((helpers.isObject(req.body) && !helpers.isEmptyObject(req.body)) || (!helpers.isObject(req.body) && req.body))) {
        requestOptions.body = req.is('application/json') ? JSON.stringify(req.body) : req.body;
      }

      if(req.is('urlencoded')) {
        requestOptions.form = req.body;
      }

      if(req.is('multipart')) {
        const form = new multiparty.Form();

        try {
          await new Promise((resolve, reject) => {
            form.parse(req, (error, fields, files) => {
              if(error) {
                return reject(error);
              }

              requestOptions.formData = {};

              if(fields && !helpers.isEmptyObject(fields)) {
                Object.keys(fields).forEach(fieldKey => {
                  requestOptions.formData[fieldKey] = Buffer.from(fields[fieldKey]);
                });
              }

              if(files && !helpers.isEmptyObject(files)) {
                Object.keys(files).forEach(fileKey => {
                  requestOptions.formData[fileKey] = files.map(file => fs.createReadStream(file.path));
                });
              }

              resolve();
            });
          });
        } catch(error) {
          return reject({ data: error, response: {} });
        }
      }

      request(requestOptions, async (error, response, body) => {
        const returnError = error => reject({ data: error, response });

        if(!body) {
          body = '{ "success": true }';
        }

        if(error) {
          return returnError(error);
        }

        if(/errorCode/.test(body)) {
          return returnError(JSON.parse(body));
        }

        const rawBody = this.replaceRemoteLinks(body);
        const requestId = uniqid(req.params[1] ? `${req.params[1].replace(/\//g, '-').toLowerCase()}-` : '');
        const basePath = path.resolve(responseDataPath, '..', '..');
        const responsePath = path.join(basePath, requestId);

        try {
          await fs.copy(path.join(basePath, 'default'), responsePath);
        } catch(error) {
          return returnError(error);
        }

        try {
          const descriptorPath = path.join(responsePath, 'descriptor.json');
          const dataPath = path.join(responsePath, 'data.json');
          const descriptor = await fs.readJson(descriptorPath);
          const descriptionRequest = descriptor.request;
          const descriptionResponse = descriptor.response;
          const isCSSResponse = /\/pages\/css/.test(req.originalUrl);
          let responseContent = rawBody;

          try {
            responseContent = JSON.parse(rawBody);
          } catch(error) {
            if(!isCSSResponse) {
              return returnError(rawBody);
            }
          }

          descriptor.id = requestId;
          descriptor.url = req.originalUrl;
          descriptor.responseDataPath = dataPath;
          descriptor.descriptorPath = descriptorPath;
          descriptor.operationId = endpointMapping.requestData.operationId;
          descriptor.enabled = true;
          descriptionRequest.statusCode = response.statusCode.toString();

          if(descriptionRequest.parameters) {
            const attachProperties = (properties, type) => {
              Object.keys(properties).filter(property => !/[\d]+/.test(property)).forEach(property => {
                descriptionRequest.parameters[type][property] = properties[property];
              });
            };

            if(helpers.isObject(descriptionRequest.parameters.path)) {
              attachProperties(req.params, 'path');
            }

            if(helpers.isObject(descriptionRequest.parameters.query)) {
              attachProperties(req.query, 'query');
            }
          }

          descriptionRequest.method = req.method.toLowerCase();

          // TODO
          // Figure out which headers are necessary to be matched in the request
          //// delete req.headers.cookie;
          //// req.headers = JSON.parse(this.replaceRemoteLinks(JSON.stringify(req.headers)));
          //// descriptionRequest.headers = req.headers;

          descriptionRequest.body = req.body ? req.body : {};

          // TODO
          // Figure out which headers are necessary to present in the response
          //// descriptionResponse.headers = response.headers;

          await fs.outputJSON(descriptorPath, descriptor, { spaces: 2 });

          if(isCSSResponse) {
            await fs.outputFile(dataPath, responseContent);
          } else {
            await fs.outputJSON(dataPath, responseContent, { spaces: 2 });
          }

          this.endpointsMapping.push({
            id: descriptor.id,
            responseDataPath: descriptor.responseDataPath,
            descriptorPath: descriptor.descriptorPath,
            operationId: descriptor.operationId,
            enabled: descriptor.enabled,
            method: descriptionRequest.method,
            path: endpointMapping.path,
            requestData: endpointMapping.requestData,
            requestDefinition: descriptionRequest,
            responseDefinition: descriptionResponse
          });

          winston.info(`Synced: ${remoteUrl.replace(/[?&]syncRemote=true/, '')}`);
          resolve(JSON.stringify(responseContent));
        } catch(error) {
          return returnError(error);
        }
      });
    });
  }

  bundleFiles() {
    return new Promise(async (resolve, reject) => {
      winston.info('[bundler:compile] Bundling files..');

      try {
        await this.transpiler.less();
        await this.transpiler.js();
        resolve();
      } catch(error) {
        reject(error);
      }
    });
  }

  setHosts(log = false) {
    return new Promise(async (resolve, reject) => {
      if(!this.options.hosts) {
        return resolve();
      }

      try {
        await this.hostsManager.setHosts(log);
        winston.info(`Hosts set!`);
        resolve();
      } catch(error) {
        return reject(error);
      }
    });
  }

  unsetHosts(log = false) {
    return new Promise(async (resolve, reject) => {
      if(!this.options.hosts) {
        return resolve();
      }

      try {
        await this.hostsManager.unsetHosts(log);
        winston.info(`Hosts unset!`);
        resolve();
      } catch(error) {
        return reject(error);
      }
    });
  }

  async transpiledJsResponse(type, req, res) {
    const fileParam = req.params.file.replace('.min', '');
    let fileName = path.basename(fileParam);

    try {
      let basePath = config.dir.transpiled;

      if(/\/element\//.test(fileParam)) {
        basePath = path.join(config.dir.project_root);
        fileName = fileParam;
      }

      const foundFile = await glob(path.join(basePath, type, '**', fileName));

      if(foundFile.length) {
        res.type('js');
        return res.send(await fs.readFile(foundFile[0]));
      }

      return this.proxyRequest(req, res);
    } catch(error) {
      res.status(500);
      res.send(error);
    }
  }

  async fileResponse(localPath, req, res) {
    try {
      let foundFile = await glob(localPath);

      if(foundFile.length) {
        foundFile = foundFile[0];
        const type = mime.getType(foundFile);

        res.type(type);
        return res.send(await fs.readFile(foundFile));
      }

      return this.proxyRequest(req, res);
    } catch(error) {
      winston.error(error);
      res.status(500);
      res.send(error);
    }
  }

  replaceRemoteLinks(body) {
    return body.replace(new RegExp(this.hostname, 'g'), this.localHostname);
  }

  async proxyRequest(req, res, originalPath) {
    try {
      originalPath = typeof originalPath === 'string' ? originalPath : req.originalUrl;

      if(!originalPath.startsWith('/')) {
        originalPath = `/${originalPath}`;
      }

      const url = (`${this.domain}${originalPath}`);
      winston.info(`Proxying request ${url}`);

      const headers = JSON.stringify(req.headers);
      req.headers = JSON.parse(headers.replace(new RegExp(this.localHostname, 'g'), this.hostname));

      req.pipe(request(url, { rejectUnauthorized: false }).on('response', response => {
        const setCookiesHeader = response.headers['set-cookie'];
        const contentType = mime.getType(urlParser.parse(url).pathname);

        if(contentType) {
          response.headers['content-type'] = contentType;
        }

        // Encodes any unicode character
        // This comes from Incapsula
        if (setCookiesHeader && Array.isArray(setCookiesHeader)) {
          response.headers['set-cookie'] = setCookiesHeader.map(cookie =>
            jsesc(cookie)
          );
        }
      })).pipe(res);
    } catch(error) {
      winston.error(error);
      res.status(500);
      res.send(error);
    }
  }

  loadApiSchema() {
    return new Promise((resolve, reject) => {
      grabApiSchema('grab', this.commandInstance, error => {
        if(error) {
          return reject(error);
        }

        resolve();
      });
    });
  }

  loadOCCLibraries() {
    return new Promise((resolve, reject) => {
      grabLibraries('grab-all', this.commandInstance, error => {
        if(error) {
          return reject(error);
        }

        resolve();
      });
    });
  }

  loadRoutes(app) {
    return new Promise(async (resolve, reject) => {
      try {
        const routesPath = path.join(__dirname, 'routes');
        const occRoutes = await glob(path.join(routesPath, 'occ', '**', '*.js'));

        // Loading local routes
        app.use('/local-admin/api', require(path.join(routesPath, 'admin'))(this));

        occRoutes.filter(route => !/index-page/.test(route)).forEach(routePath => {
          require(routePath)(app, this);
        });

        // Loading index page
        require(path.join(routesPath, 'occ', 'index-page'))(app, this);
        resolve();
      } catch(error) {
        return reject(error);
      }
    });
  }

  deleteRoutes(ids = []) {
    return new Promise(async (resolve, reject) => {
      try {
        const endpointsMapping = this.endpointsMapping;
        for(const id of ids) {
          for(const [index, endpointMapping] of endpointsMapping.entries()) {
            if(id === endpointMapping.id) {
              await fs.remove(path.dirname(endpointMapping.responseDataPath));
              endpointsMapping.splice(index, 1);
              break;
            }
          }
        }

        resolve();
      } catch(error) {
        return reject(error);
      }
    });
  }

  updateRoute(id, body, type) {
    return new Promise(async (resolve, reject) => {
      try {
        const endpointsMapping = this.endpointsMapping;
        for(const [index, endpointMapping] of endpointsMapping.entries()) {
          if(id === endpointMapping.id) {
            if(type === 'descriptor') {
              await fs.writeJSON(endpointMapping.descriptorPath, body, { spaces: 2 });
              this.endpointsMapping[index].requestDefinition = body.request;
              this.endpointsMapping[index].responseDefinition = body.response;
              this.endpointsMapping[index].id = body.id;
              this.endpointsMapping[index].enabled = body.enabled;
              this.endpointsMapping[index].descriptorPath = body.descriptorPath;
              this.endpointsMapping[index].responseDataPath = body.responseDataPath;
              this.endpointsMapping[index].operationId = body.operationId;
            } else if(type === 'response') {
              await fs.writeJSON(endpointMapping.responseDataPath, body, { spaces: 2 });
            }
            break;
          }
        }

        resolve();
      } catch(error) {
        return reject(error);
      }
    });
  }

  run() {
    return new Promise(async (resolve, reject) => {
      const customApiDir = config.dir.instanceDefinitions.customApi;
      const oracleApiDir = config.dir.instanceDefinitions.oracleApi;
      const schemaPath = path.join(oracleApiDir, 'schema.json');
      const customSchemaPath = path.join(customApiDir, 'schema.json');
      const customResponsesPath = path.join(customApiDir, 'responses');
      this.mocksPath = config.dir.mocks;

      try {
        if (!fs.existsSync(config.dir.instanceDefinitions.oracleLibs)) {
          winston.info("Oracle Libraries are not present locally. downloading them...");
          await this.loadOCCLibraries();
        }

        if (!fs.existsSync(schemaPath)) {
          winston.info("Environment API Schema is not present locally, downloading it...")
          await this.loadApiSchema();
        }

        winston.info('');
        await this.setLocalFiles();

        if(!this.options.onlyServer) {
          await this.bundleFiles();
        }

        if(!this.options.hosts) {
          winston.info(`You will need to the host "${this.localHostname}" in your hosts file(usually /etc/hosts on Unix)`);
          winston.info(`If you want the hosts to be set automatically, please use the option --hosts`);
          winston.info(`You can be asked for your root password. We need this to change your hosts file`);
          winston.info('');
        }

        await this.setHosts(true);
      } catch(error) {
        return reject(error);
      }

      const ssl = await devcert.certificateFor(this.localHostname, { skipHostsFile: true });
      const app = express();
      const port = config.localServer.api.port;

      const schema = fs.readJsonSync(schemaPath, 'utf8');
      let customSchema;

      if (fs.existsSync(customSchemaPath)) {
        customSchema = fs.readJsonSync(customSchemaPath);
      }

      let customResponses;
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
            let requestsDefinition = await glob(path.join(responsePath, '**', 'descriptor.json'));

            // replace the response path by the custom response path
            if(customRequestsDefinitionPath) {
              const customRequestsDefinition = await glob(path.join(customRequestsDefinitionPath, '**', 'descriptor.json'));
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
                const basePath = !/\/ccstore/.test(requestPath) ? schema.basePath : '';
                let requestEndpoint = `${basePath}${requestPath}`;

                this.endpointsMapping.push({
                  id: descriptor.id,
                  responseDataPath,
                  descriptorPath: definitionPath,
                  operationId: requestData.operationId,
                  enabled: descriptor.enabled,
                  method: requestDefinition.method,
                  path: `*${requestEndpoint}`,
                  requestData,
                  requestDefinition,
                  responseDefinition
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

      app.use(bodyParser.json());
      app.use(bodyParser.text());
      app.use(express.urlencoded({ extended: true }));

      // Disabling ETag because OCC tries to parse it and we don't have a valid value for this
      app.set('etag', false);

      // Setting routes
      await this.loadRoutes(app);
      winston.info('Starting api server...');

      const server = https.createServer(ssl, app).listen(port, () => {
        winston.info(`Running api server on port ${port}`);
        winston.info(`local domain: ${this.localHostname}`);
      });

      exitHook(async callback => {
        try {
          await this.closeServer(server);
        } catch(error) {
          winston.error(error);
        }

        callback();
      });
    });
  }

  closeServer(server) {
    return new Promise((resolve, reject) => {
      winston.info('Closing server...');
      server.close(async () => {
        try {
          await this.unsetHosts(true);
        } catch(error) {
          return reject(error);
        }

        winston.info("Server Closed!")
        resolve();
      });
    });
  }
}

module.exports = async function(action, options, callback) {
  const localServer = new LocalServer(options, this);

  try {
    if (action === 'run') {
        callback(null, await localServer.run());
    } else {
        callback();
    }
  } catch(errorResponse) {
    callback(errorResponse);
  }
};
