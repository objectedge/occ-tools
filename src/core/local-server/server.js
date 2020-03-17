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
const Transpiler = require('./transpiler');
const HostsManager = require('./hosts-manager');
const endpointsMapping = [];

class LocalServer {
  constructor(options, instance) {
    this.options = options;
    this.instanceOptions = instance.options;
    this.domain = config.endpoints.dns;
    this.localDomain = config.endpoints.local;
    this.hostname = url.parse(this.domain).hostname;
    this.localHostname = url.parse(this.localDomain).hostname;
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
      regions.forEach(region => region.widgets
        .forEach(widget => {
            for(const localWidget of localWidgets) {
              widgets.push({ regionId: region.id, data: widget, localPaths: widget.typeId.includes(localWidget) ? this.localFiles.widgets[localWidget] : [] });
            }
          }
        )
      );
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
        return res.send(await fs.readFile(foundFile[0]));
      }

      return this.proxyRequest(req, res, req.originalUrl);
    } catch(error) {
      winston.error(error);
      res.status(500);
      res.send(error);
    }
  }

  syncStoreRequest(req, responseDataPath) {
    return new Promise((resolve, reject) => {
      if(req.__syncRemote) {
        delete req.__syncRemote;
      }

      const requestOptions = {
        rejectUnauthorized: false,
        gzip: true
      };

      const remoteUrl = `${this.domain}/${req.originalUrl}`;

      const headers = JSON.stringify(req.headers);
      req.headers = JSON.parse(headers.replace(new RegExp(this.localHostname, 'g'), this.hostname));

      req.pipe(request(remoteUrl, requestOptions, async (error, response, body) => {
        if(error) {
          reject(error);
          return;
        }

        const rawBody = this.replaceRemoteLinks(body);
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

          resolve(content);
        } catch(error) {
          reject(error);
        }
      }));
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
      const foundFile = await glob(path.join(config.dir.transpiled, type, '**', fileName));

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
    return body.replace(new RegExp(this.domain, 'g'), this.localDomain);
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

  setCCStoreRoutes(app) {
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

    const middleware = (requestDefinition, req, res, next) => {
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

    for(const endpointMapping of endpointsMapping) {
      const requestEndpoint = endpointMapping.path;
      const requestDefinition = endpointMapping.requestDefinition;
      const requestData = endpointMapping.requestData;
      const responseDefinition = endpointMapping.responseDefinition;
      const responseDataPath = endpointMapping.responseDataPath;

      app[requestDefinition.method](requestEndpoint, middleware.bind(this, requestDefinition), async (req, res) => {
        res.header("OperationId", requestData.operationId);

        if(this.proxyAllApis) {
          return this.proxyRequest(req, res);
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

        // Sync local with remote
        if(req.__syncRemote || this.syncAllApiRequests) {
          try {
            await this.syncStoreRequest(req, responseDataPath);
          } catch(error) {
            winston.error(`The following request was not synced :${req.originalUrl}`);
            winston.error("Reason: ", error);
          }
        }

        let content = await fs.readFile(responseDataPath, 'utf8');

        if(/ccstoreui\/v1\/pages\/layout\//.test(req.originalUrl)) {
          try {
            content = await this.replaceLayoutContent(content);
          } catch(error) {
            winston.info(error);
            res.status(500);
            res.send(error);
          }
        }

        res.send(content);
      });
    }
  }

  setRoutes(app) {
    app.use(bodyParser.json());
    app.use(bodyParser.text());

    // Disabling ETag because OCC tries to parse it and we don't have a valid value for this
    app.set('etag', false);

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

      const fullPathToMock = path.join(this.mocksPath, mockQueryParamPath);
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
      return this.fileResponse(path.join(config.dir.project_root, 'files', '**', req.params.file), req, res);
    });

    app.get('/file/*/global/:file(*.js)', this.transpiledJsResponse.bind(this, 'app-level'));
    app.get('/file/*/widget/:file(*.js)', this.transpiledJsResponse.bind(this, 'widgets'));
    app.get('/file/*/widget/:version?/:widgetName/*/:file(*)', this.templateResponse.bind(this));
    app.get('/ccstore/v1/images*', this.proxyRequest.bind(this));
    app.get('/file/*/css/:file(*)', async (req, res) => {
      return this.fileResponse(path.join(config.dir.transpiled, 'less', req.params.file), req, res);
    });

    app.get('*general/:file(*)', async (req, res) => {
      return this.fileResponse(path.join(config.dir.project_root, 'files', 'general', req.params.file), req, res);
    });

    app.use(async (req, res, next) => {
      if(/ccstore/.test(req.originalUrl)) {
        return next();
      }

      try {
        let htmlText = await fs.readFile(path.join(__dirname, 'static', 'index.html'), 'utf8');
        const navState = {
          "referrer": "/",
          "statusCode": "200"
        };

        let pageNumber = req.originalUrl.match(/[0-9]+$/);
        if(pageNumber) {
          navState.pageNumber = pageNumber[0];
        }

        htmlText = htmlText.replace(/"\{\{ccNavState\}\}"/, JSON.stringify(navState));
        res.send(htmlText);
      } catch(error) {
        res.status(500);
        res.send(error);
      }
    });

    this.setCCStoreRoutes(app);
  }

  run() {
    return new Promise(async (resolve, reject) => {

      // const headers = {
      //   host: 'shop-test2.motorolasolutions.com',
      //   connection: 'keep-alive',
      //   pragma: 'no-cache',
      //   'cache-control': 'no-cache',
      //   origin: 'https://shop-test2.motorolasolutions.com',
      //   'sec-fetch-dest': 'font',
      //   'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36',
      //   accept: '*/*',
      //   'sec-fetch-site': 'same-origin',
      //   'sec-fetch-mode': 'cors',
      //   referer: 'https://shop-test2.motorolasolutions.com/file/v4602491664175275731/css/base.css?occsite=siteUS',
      //   'accept-encoding': 'gzip, deflate, br',
      //   'accept-language': 'en-US,en;q=0.9',
      //   cookie: 'visid_incap_1217051=9h+4hqneSOSL/x8it9w3OlHuo10AAAAAQUIPAAAAAAC8sokpgyp6xO4NvhjyFCOg; visid_incap_1695016=QIlz2ANpRNK7TRniSCgSb6SFpF0AAAAAQUIPAAAAAADadVhpcbKYLRRxNVy4mXA3; visid_incap_2157814=MLx0TCT1QzWCLDjf/k8xouG5pV0AAAAAQUIPAAAAAAAtwxtbrszOS9cnPkfMJImh; nlbi_2157814=rXHOBbEfZzjCVU7PFCjX8AAAAAD6AVcgaHFhYbyBrKgAnHLe; visid_incap_1695012=j/GQeIB0QvSrpr8FV6AY+Mk6pl0AAAAAQUIPAAAAAADfkKWsuC9sMxlnixTZ0N75; visid_incap_2008308=jL0ZI69CSdGblQQFvOBNDs86pl0AAAAAQUIPAAAAAADiUu4LlaMw4oHqOHFuggtJ; nlbi_2008308=iqq8R2I+dRJC9oxsWqAKnQAAAADVdeH3RojmZ7agwtEKxdOR; visid_incap_1695010=TuQ0pRSDTtGimtprCzTTuQ4+pl0AAAAAQUIPAAAAAABO2aYWklqde+9dElyEC0/S; visid_incap_907285=hxhLGB9LSeSGW3FiN49f2x0+pl0AAAAAQUIPAAAAAACqBAOaekXlle0q5TKTf+2q; visid_incap_1580053=GazPRpCARfC6vXTYbS8n3O9Dpl0AAAAAQUIPAAAAAACAjwoj/mNm3BaxePIWGbcq; visid_incap_1695007=aMuWnZIkQt6PvR+q9RwfTkKcp10AAAAAQUIPAAAAAACyiE6h3ZIdBKin8TmF2Kj4; ga_sync_ran=1; check=true; visid_incap_1982572=VkAJrtsMQdKbkhGpynJfPJww7F0AAAAAQUIPAAAAAAALkfLYiCgd1vjMhazS1NzU; nlbi_1982572=valwQYeQEAvaynr65+1KCQAAAAAhbQmH2Z94dh9+ImKY7Ux1; nlbi_1656993=MNEKSTfzOzH7OtmpQVPvnAAAAADYVNlB/K1Dv6R6aCLFOnJ+; visid_incap_1656993=g/ykA6WuQ16FbWsVsi8lwiciBV4AAAAAQUIPAAAAAABGM5hXQHX7rUZPrPKro5IK; nlbi_1656989=yTzCPMcwxEM2Yt16oiToUwAAAABUmpJrWpRKGSJ2dXqNtN4w; visid_incap_1656989=uqX20zviQWq8kd2eAEG753wRM14AAAAAQUIPAAAAAACq6UaK0vOhsa0XucwFbsXU; applicationid=INSIGHT_AEM_PUBLISH; nlbi_1695007=UdvxcbGieQkIl3NSoGLYkwAAAACYhSx8nRnnxUxTsTo7y0wl; _bcvm_vid_4205198233992355619=2331080345580109812T12C62850FCC9ABE0313235C17EB6D17F2D70202911F0BCD5B40E4A68AA1BEBF227A7EFCA70CC1AE9313406BE3DE9B1C8C71FF72190298FC7DE410D2DF21D767C; nlbi_1217051=dRESVrA3gznCX6UV7tHlpwAAAAACdBYP/TiqACbbm/majNzc; nlbi_907285=bVcaV/bZLnxHQeQ7FwRgpwAAAADkUye3KnAP2X64W0H65wWc; nlbi_1580053=v6UfOj+hfVy+hFhCojc0lgAAAAC1dsdb4Y6ep/tcmuasJJHD; channel_name=direct; channel_category=direct; _bcvm_vrid_1127738362202018805=2331069334991143640TB0A8F7865540868F1909AAEAC24005104137F9F076976A52AC9A2022AD591B9384ED2F46B17C86F8ABBB01BAFF12163748343E9A3A273D91B54B5858997A128F; SSOSOURCEID=https://aem-qa-publish.motorolasolutions.com/en_us/registration?app=OCC&short=true&path=/; OCCSESSION=Y; BIGipServerccstore-uat-zd8a_oracleoutsourcing_com_http=3090191489.40467.0000; dtCookie=-15$KSGIU1OD3J8GV4SFD14BH9AA8U3D48IL; rxVisitor=15837934074385B27PEPK18JS6R21QKP0JPI14JK92V8H; _bcvm_vrid_1127738362202018805=2331069334991143640TB0A8F7865540868F1909AAEAC24005104137F9F076976A52AC9A2022AD591B9384ED2F46B17C86F8ABBB01BAFF12163748343E9A3A273D91B54B5858997A128F; incap_ses_684_1695012=q9nuGWkKfyFoheg2tA9+CcJLaF4AAAAAmX2YZWVyUJVCWwjOF5L1dg==; incap_ses_684_2008308=TTvrM0GCRQK9jOg2tA9+Cc5LaF4AAAAArIeAv4NzUEOXIOAvNONjBw==; incap_ses_1241_1695012=IXa3DnDZCSdDc4ndXus4EZabaV4AAAAA1+QKfNOCiC9mj79j+yPZTw==; visid_incap_1293485=cNGDDNr2ROO4abhkucWPOeCpaV4AAAAAQUIPAAAAAAAP/yrlYw7r491wY6KXuHbr; nlbi_1293485=OCMOdghei11Tog8VDeFgxAAAAACBo2wyxRWxw+YvMIg6YdyN; incap_ses_684_1293485=O9BUfoHe1mbHbBKGtg9+CeGpaV4AAAAAznQam4NxRz0dpib6cyyu6Q==; incap_ses_1239_1695012=v+fFGsjkvmePeaHsXNAxEXV4al4AAAAA/gNN8gRSWu7fp1nz+s3iwA==; incap_ses_1239_2008308=usZlRU5YvjkHn6HsXNAxEZZ4al4AAAAAH52EXutXDoKlY6R3Fd8org==; incap_ses_169_1695012=x+R6bqe4vH8c1eEbcWpYAvnZal4AAAAAxxMmTI5wVhuiOwqipLmAcA==; incap_ses_169_2008308=+Ge2ZbA+GE7iZ+0bcWpYAvjkal4AAAAAOZWWEhdXs/3vQqVK5PaxGw==; incap_ses_486_1695016=RGn4PGfbhB8iDBzAOZ++Bq+ma14AAAAAP+pl1NsDM+IXezidbAAaKg==; incap_ses_486_1695010=S3FwNIcee2ds/pvAOZ++Bsbca14AAAAA+6Xv5ei8PfYz/1DW9Dpwmg==; incap_ses_486_1695012=H5vhWG/YN0WxJqrAOZ++Bkbja14AAAAAb1mMId/gaRmsOoXM+TPiCg==; incap_ses_486_2008308=3QsqGO7bKlrVWL7AOZ++BhHsa14AAAAA1RH0ffAsuBVM+2VR47tEmg==; incap_ses_788_1695012=sWGQVWQKvA+BaJGMBovvCtCfbV4AAAAAUmMkvTmSyn7Ttu1GrFuiqA==; incap_ses_788_2008308=2ejXLx4KeGlBg5WMBovvCqmqbV4AAAAAL1mlkHZmeiXDAO1Zkul1JA==; incap_ses_789_2008308=djr1FoSG0CwK7aWFhxjzCjo0bl4AAAAAwyYctjn5Sq0HG9SAggnafA==; incap_ses_789_1695012=owvICOYeymHhAQmGhxjzCo7Vbl4AAAAAnjlwIJnRjnGYBAsWnTxJ3w==; incap_ses_143_1695010=v7qRNiOz7xNPc4cDzAn8AVCIb14AAAAAmzRs+z8g1oYaeQYsQTs/3w==; nlbi_1695010=cU7xfA/n9jzy6O4/RghAAgAAAAASHwXs2RMeZ96EwcZHDrks; incap_ses_298_2008308=CubYD9XHoyx4ETtzGrYiBBrCb14AAAAAU887OosvgsFD6Um7iKiX+A==; incap_ses_298_1695012=MzmdJ+x6QACz8XZzGrYiBJn7b14AAAAAPeNp4e3/ocDnf6UKjbx9eA==; incap_ses_143_1695016=81/IQvg0Rw2dfAgGzAn8AQTdcF4AAAAAcZ8RI+yUUFf7PNOdDCiMZg==; _bcvm_vid_1127738362202018805=2331114693311929287T9FEA4C813AB7598CAA6DA59AFC44AEF7B95528B0E73006C27DAD22775887749E9D46D5F4A9D4E0E7E619F17BE1636F62FC81C9BEC53A53B79B326D6427586319; incap_ses_143_2008308=rjbpQHAnujosGA8GzAn8AVzgcF4AAAAARuPlr/Ul7J6br+iFWI902A==; chosen_customer_number=DUMMY_ACCOUNT; chosen_contract=NO_CONTRACT; occ-shopping-cart=5; oe-recently-viewed-products=HNN9012AR*NTN9862D*HNN9008AR*0180351A44*WPLN4214B*; nlbi_1695016=ybq4MCHtPj1mwo5qWS5FmQAAAAAdPWu97Yc/5vkqpTsHCkXs; OPTOUTMULTI=0:0%7Cc1:0%7Cc3:0%7Cc2:0%7Cc5:0%7Cc6:0; incap_ses_222_1377994=PSSiR5idZ1xTLNEXRbUUA5bvcF4AAAAAZjBukNaPoQROxCFgTPXHow==; incap_ses_684_1377994=uA/oFYc68mpK2ciKtg9+CZXvcF4AAAAAeoB8x5WKzP7jpLcvkwuM4w==; incap_ses_169_1377994=30iTXjtpLg1km7Vsc2pYApzvcF4AAAAAQC89nO281O8KqUtHkx7hXA==; incap_ses_1241_1377994=ha3DRlyqtyeHUADjXus4EZzvcF4AAAAA0/eH9UYVxXrvzUdVqFCKXA==; incap_ses_987_1377994=7C0TQDiEJiEiBsG7R4iyDZzvcF4AAAAAe6NvQVGPVBWrsvVHLGHC3A==; incap_ses_1171_1377994=FP8uLJLWYVPbSmXB2TpAEKbvcF4AAAAAzVr05GTArGs9R0LWmIIy3Q==; incap_ses_490_1377994=NLZoQy+VBQ26sRfNE9bMBqfvcF4AAAAAtZOacZtsS7Nu6pRAjdI2+w==; visid_incap_1377994=38wBg9ACTdWB6EIgOTJBn6fvcF4AAAAAQUIPAAAAAADu04q6YTK52cZxnRCEcJvO; nlbi_1377994=huU6fKTzMwKbWmhAl/YTVgAAAACWhzzOMsQVXJi7Nj0VQu1p; incap_ses_1169_1377994=FiOAUh9udXBv1rNz4x85EKfvcF4AAAAAJaHsWFMgb6JkLpLa1rc/JA==; oauth_token_secret-storefront-msi=eyJhbGciOiJSUzI1NiIsImprdSI6InN6ZDhhMGMwIiwia2lkIjpudWxsLCJ4NWMiOm51bGwsIng1dSI6Imh0dHBzOi8vc2hvcC1zdGFnZS5tb3Rvcm9sYXNvbHV0aW9ucy5jb20vY2NzdG9yZS92MS90ZW5hbnRDZXJ0Q2hhaW4ifQ==.eyJpYXQiOjE1ODQ0NTk5MDcsImV4cCI6MTU4NDQ2MTczNywic3ViIjoiMTM5MTExMzUiLCJhdWQiOiJzdG9yZWZyb250VUkiLCJjb20ub3JhY2xlLmF0Zy5jbG91ZC5jb21tZXJjZS5yb2xlcyI6bnVsbCwib2Njcy5hZG1pbi5yb2xlcyI6bnVsbCwiaXNzIjoiaHR0cHM6Ly9zaG9wLXN0YWdlLm1vdG9yb2xhc29sdXRpb25zLmNvbS8iLCJvY2NzLmFkbWluLmxvY2FsZSI6bnVsbCwib2Njcy5hZG1pbi50eiI6bnVsbCwib2Njcy5hZG1pbi50ZW5hbnRUeiI6IkFtZXJpY2EvQ2hpY2FnbyIsIm9jY3MuYWRtaW4ua2VlcEFsaXZlVVJMIjoiaHR0cHM6Ly9zaG9wLXN0YWdlLm1vdG9yb2xhc29sdXRpb25zLmNvbS8iLCJvY2NzLmFkbWluLnRva2VuUmVmcmVzaFVSTCI6Imh0dHBzOi8vc2hvcC1zdGFnZS5tb3Rvcm9sYXNvbHV0aW9ucy5jb20vY2NzdG9yZS92MS9zc29Ub2tlbnMvcmVmcmVzaCIsIm9jY3MuYWRtaW4udmVyc2lvbiI6IjIwLjEuMiIsIm9jY3MuYWRtaW4uYnVpbGQiOiJqZW5raW5zLUFzc2VtYmxlX0Nsb3VkX0NvbW1lcmNlX0VBUnNfLW1hc3Rlci0xMzEiLCJvY2NzLmFkbWluLmVtYWlsIjpudWxsLCJvY2NzLmFkbWluLnByb2ZpbGVJZCI6IjEzOTExMTM1Iiwib2Njcy5hZ2VudC5vYm8iOm51bGwsIm9jY3MuYWRtaW4uZmlyc3ROYW1lIjpudWxsLCJvY2NzLmFkbWluLmxhc3ROYW1lIjpudWxsLCJvY2NzLmFkbWluLnB1bmNob3V0VXNlciI6ZmFsc2UsInN1Yl90eXBlIjpudWxsLCJzY29wZSI6bnVsbH0=.Q+j3TaK+j7+RyUwGjM+xipbNRTv0kq6EyJbs2uvGJ8q9Q0nr7jG5YiLMbceTKrjtoJxKkrGXRA/RiybE6SqWyn9vNnfgwkixgswRNuMXmDMLbh4CJttcaIHiG6kfY18YPWxqOjjfLjixSsOZBigGARET9jWyARr57y9WC5gB0BHbOiH6IEXOf5Lw8ZuAFggmj4S6MbkpIeHrrfIPImM4CadpDv6C3hl6wiTCnTVyzCoJTRaRjyfzqMhgopem93NiqqH/V0T20xy2dKwCVhGFstZ4ujicvpHZGMY4mbMZ9RzqQINEYFqLOO1CaFrrm+kNPHb6EpuglmWerOSsTfuihQ==; JSESSIONID=dMHp76y6Y5C2RFWi15L3_6yJTIB508Ikhq1Kde8pVTGsiJMNGuaV!-1647225658; incap_ses_143_1695012=V1XOGAzHLGf00OIGzAn8AbsicV4AAAAA6ABY3wr+EQwMH1W6rAOBDw==; incap_ses_887_1695012=VXcDOa6Wkktu992n5kJPDOQjcV4AAAAAAZu0DR4uUmzRt3PXxJ039g==; rxvt=1584475157058|1584472767683; dtPC=-15$472767651_918h1p-15$472786458_977h1p-15$472905825_654h1p-15$472991206_640h1p-15$473066725_59h1p-15$473290005_510h1p-15$473357040_770h1vSYXVTGVLFVOIGFYWIFDIXPOPPFCJMMVT; nlbi_1695012=T41Xfg/MACsoSXeHw9T44wAAAAClPqz6G3546yY4xaTnZEy+; utag_main=v_id:01709b6bc5200021d9655b067f2802079004e07100e50$_sn:35$_ss:0$_st:1584475166092$dc_visit:35$vapi_domain:motorolasolutions.com$ses_id:1584472768631%3Bexp-session$_pn:7%3Bexp-session$dc_event:19%3Bexp-session; _bcvm_vid_1127738362202018805=2331114693311929287T9FEA4C813AB7598CAA6DA59AFC44AEF7B95528B0E73006C27DAD22775887749E9D46D5F4A9D4E0E7E619F17BE1636F62FC81C9BEC53A53B79B326D6427586319; bc_pv_end=2331114877975884857TFB35E9B819470D35CCE6BA04E7D007F0A50C6C9BB40A60389E06F4270D7469925EC522D12A2AD5D9BF495D9ED0902375B0129D65BCC416DEBEFC2A8F5CA761C3'
      // };

      // request('https://shop-test2.motorolasolutions.com/file/general/84aca29a-4c10-46bd-b81b-18b6ae4ee243.woff2', { rejectUnauthorized: false, headers }, (error, response, body) => {
      //   console.log(error);
      // });

      // return;

      const customApiDir = config.dir.instanceDefinitions.customApi;
      const oracleApiDir = config.dir.instanceDefinitions.oracleApi;
      const schemaPath = path.join(oracleApiDir, 'schema.json');
      const customSchemaPath = path.join(customApiDir, 'schema.json');
      const customResponsesPath = path.join(customApiDir, 'responses');
      this.mocksPath = config.dir.mocks;

      if (!fs.existsSync(schemaPath)) {
        return reject(`The main schema.json ${schemaPath} doesn't exist... run grab-all to sync your environment`);
      }

      try {
        await this.setLocalFiles();
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
                let requestEndpoint = `${schema.basePath}${requestPath.replace('{id}', ':id').replace('{path: .*}', ':path').replace('{}', ':path').replace('{bundle}', ':bundle')}`;

                if(requestDefinition.queryParameters) {
                  Object.keys(requestDefinition.queryParameters).forEach(queryParamKey => {
                    if(/^:/.test(queryParamKey)) {
                      requestEndpoint = requestEndpoint.replace(queryParamKey, requestDefinition.queryParameters[queryParamKey]);
                      delete requestDefinition.queryParameters[queryParamKey]
                    }
                  });
                }

                if(/:id|:path/.test(requestEndpoint)) {
                  return;
                }

                endpointsMapping.push({
                  method: requestDefinition.method,
                  path: `*${requestEndpoint}`,
                  requestData,
                  responseDataPath,
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

      // Setting routes
      this.setRoutes(app);
      winston.info('Starting api server...');

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

          winston.info('Done!');
          callback();
          resolve();
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
    callback(errorResponse);
  }
};
