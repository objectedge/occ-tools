var path = require('path');
var fs = require('fs-extra');
var os = require('os');
var occToolsConfigsCore = new (require('./configs'));

var configsDir = occToolsConfigsCore.getConfigsDir();
var configsFilePath = occToolsConfigsCore.getConfigsFilePath();
var configsData = occToolsConfigsCore.getConfigsJSON();

if(!configsData) {
  process.exit();
}

var currentIP = occToolsConfigsCore.getCurrentIP();
var baseUrl = configsData.projects.current.url;
var username = configsData.projects.current.credentials.username;
var password = configsData.projects.current.credentials.password;
var storefrontDir = configsData.projects['storefront-dir'];
var absoluteStorefrontDir = path.join(configsData.projects.current.path, storefrontDir);

var useMFALogin = typeof configsData['use-mfa-login'] !== 'undefined' ? configsData['use-mfa-login'] : true;
var loginCredentials = {
  grant_type: 'password',
  username: username,
  password: password
};

if(useMFALogin) {
  loginCredentials.totp_code = configsData['totp-code'];
}

var tempRootFolder = path.join(os.tmpdir(), 'occ-tools-data');
var mocksDirName = 'mocks';
var occToolsUserCommandsPath = configsData.occToolsUserCommandsPath || path.join(configsData.projects.current.path, 'occ-tools-commands');

var instanceId = baseUrl.match(/ccadmin-(.*?)\./)[1];
var instanceDefinitionsRootPath = path.join(configsData.projects.current.path, '.oracle-resources');
var librariesDir = path.join(instanceDefinitionsRootPath, 'assets', 'libraries');
var apiDir = path.join(instanceDefinitionsRootPath, 'api');

var oracleDirName = 'default';
var customDirName = 'custom';

var instanceDefinitionsDir = {
  root: instanceDefinitionsRootPath,
  instanceIdPath: path.join(instanceDefinitionsRootPath, instanceId),
  layouts: path.join(instanceDefinitionsRootPath, instanceId, 'layouts'),
  widgets: path.join(instanceDefinitionsRootPath, instanceId, 'widgets'),

  libs: librariesDir,
  oracleLibsDirName: oracleDirName,
  customLibsDirName: customDirName,
  oracleLibs: path.join(librariesDir, oracleDirName),
  customLibs: path.join(librariesDir, customDirName),

  api: apiDir,
  oracleApiDirName: oracleDirName,
  customApiDirName: customDirName,
  oracleApi: path.join(apiDir, oracleDirName),
  customApi: path.join(apiDir, customDirName)
};

var allEnvironments = occToolsConfigsCore.getCurrentEnvironments();
var envDetailsFromProject = allEnvironments.find(env => env.name === configsData.projects.current.env);

var currentEnvironmentDetails = {
  name: configsData.projects.current.name,
  env: configsData.projects.current.env,
  url: configsData.projects.current.url,
  store: baseUrl.replace('ccadmin', 'ccstore'),
  dns: baseUrl.replace('ccadmin', 'ccstore'),
  local: baseUrl.replace('ccadmin', 'loca.ccstore')
}

if(envDetailsFromProject) {
  if(envDetailsFromProject.store) {
    currentEnvironmentDetails.store = envDetailsFromProject.store;
  }

  if(envDetailsFromProject.dns) {
    currentEnvironmentDetails.dns = envDetailsFromProject.dns;
  }

  if(envDetailsFromProject.local) {
    currentEnvironmentDetails.local = envDetailsFromProject.local;
  }
}

var databaseDir = path.join(configsDir, 'database');
fs.ensureDirSync(databaseDir);

var _configDescriptor = {
  project_name: configsData.projects.current.name,
  configsDir: configsDir,
  configsFilePath: configsFilePath,
  mocksDirName: mocksDirName,
  instanceId: instanceId,
  localServer: {
    api: {
      port: 443
    },
    karma: {
      port: 9876,
      urlRoot: '/app'
    },
    database: {
      development: {
        dialect: "sqlite",
        storage: path.resolve(databaseDir, "db.development.sqlite"),
        logging: false
      },
      test: {
        dialect: "sqlite",
        storage: ":memory:"
      }
    }
  },
  dir: {
    project_base: path.join(configsData.projects.current.path),
    project_root: absoluteStorefrontDir,
    search_root: path.join(configsData.projects.current.path, 'search'),
    server_side_root: path.join(configsData.projects.current.path, 'server-side-extensions'),
    storefront_dir_name: storefrontDir,
    mocks: path.join(absoluteStorefrontDir, mocksDirName),
    instanceDefinitions: instanceDefinitionsDir,
    occToolsProject: path.join(configsData.projects.current.path, 'occ-tools.project.json'),
    transpiled: path.join(absoluteStorefrontDir, '.occ-transpiled'),
    occComponents: path.join(absoluteStorefrontDir, '.occ-components'),
    databaseDir: databaseDir
  },
  theme: {
    name: configsData.projects.current.theme.name,
    id: configsData.projects.current.theme.id
  },
  environments: occToolsConfigsCore.getCurrentEnvironments(),
  environment: {
    current: configsData.projects.current.env,
    details: currentEnvironmentDetails
  },
  occToolsPath: path.join(__dirname, '..'),
  occToolsUserCommandsPath: occToolsUserCommandsPath,
  endpoints: {
    baseUrl: baseUrl,
    admin: baseUrl + '/ccadmin/v1/',
    adminX: baseUrl + '/ccadminx/custom/v1/',
    search: baseUrl + '/gsadmin/v1/',
    adminUI: baseUrl + '/ccadminui/v1/',
    store: currentEnvironmentDetails.store,
    dns: currentEnvironmentDetails.dns,
    local: currentEnvironmentDetails.local
  },
  authEndpoints: {
    baseUrl: baseUrl,
    admin: baseUrl + '/ccadmin/v1/',
    adminX: baseUrl + '/ccadminui/v1/',
    search: baseUrl + '/ccadmin/v1/',
    adminUI: baseUrl + '/ccadminui/v1/',
    store: baseUrl.replace('ccadmin', 'ccstore')
  },
  useMFALogin: useMFALogin,
  tokens: {
    admin: {
      access: path.join(tempRootFolder, 'tokens/admin/token.txt'),
      file: path.join(tempRootFolder, 'tokens/admin/file_token.txt')
    },
    adminX: {
      access: path.join(tempRootFolder, 'tokens/admin_ui/token.txt'),
      file: path.join(tempRootFolder, 'tokens/admin_ui/file_token.txt')
    },
    adminUI: {
      access: path.join(tempRootFolder, 'tokens/admin_ui/token.txt'),
      file: path.join(tempRootFolder, 'tokens/admin_ui/file_token.txt')
    },
    search: {
      access: path.join(tempRootFolder, 'tokens/admin/token.txt'),
      file: path.join(tempRootFolder, 'tokens/admin/file_token.txt')
    }
  },
  credentials: loginCredentials,
  occToolsVersion: require('../../package.json').version,
  proxy: {
    pacFile: path.join(tempRootFolder, 'proxy/proxy.pac'),
    pacUrlPath: '/occ-tools-proxy-pac.pac',
    cacheDir: path.join(tempRootFolder, 'proxy/cache'),
    certsDir: path.join(tempRootFolder, 'proxy/certs'),
    port: 8001
  },
  OCC_DEFAULT_LIMIT: 250,
  currentIP: currentIP
};

_configDescriptor.github = {
  username: configsData.github.username,
  password: configsData.github.password,
  type: configsData.github.type,
  token: configsData.github.token
};

module.exports = _configDescriptor;
