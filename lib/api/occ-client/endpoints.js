const { stringify } = require("querystring");

const OccApiType = require("./OccApiType");
const { OccEndpointError } = require("./errors");

const _guidedSearchAdminEndpoints = {};
const _extensionServerAdminEndpoints = {
  getExtensionServerLogs: {
    method: "GET",
    hasPathParams: false,
    url: "/ccadminx/custom/v1/logs",
    authRequired: true,
    responseType: "application/x-zip-compressed",
    localeHint: null,
    id: "getExtensionServerLogs",
  },
  doServerPush: {
    method: "POST",
    requestType: "application/json",
    hasPathParams: false,
    url: "/ccadminx/custom/v1/servers/push",
    authRequired: true,
    responseType: "application/json",
    localeHint: null,
    id: "doServerPush",
  },
  doServerRestart: {
    method: "POST",
    requestType: "application/json",
    hasPathParams: false,
    url: "/ccadminx/custom/v1/servers/restart",
    authRequired: true,
    responseType: "application/json",
    localeHint: null,
    id: "doServerRestart",
  },
};

function _parsePath(endpointUrl, pathParams, endpointOptions) {
  const pathParamsCount = (endpointUrl.match(/{}/g) || []).length;

  if (pathParamsCount !== pathParams.length) {
    throw new Error(`Endpoint has 2 path parameters, but ${pathParams.length} was provided.`);
  }

  let parsedOccPath = endpointUrl;
  for (const pathParam of pathParams) {
    parsedOccPath = parsedOccPath.replace("{}", pathParam);
  }

  if (endpointOptions && endpointOptions.options && Object.keys(endpointOptions.options).length) {
    const queryString = stringify(endpointOptions.options);
    parsedOccPath = `${parsedOccPath}?${queryString}`;
  }

  return parsedOccPath;
}

function _isObjectLiteral(val) {
  return val === Object(val) && Object.prototype.toString.call(val) !== "[object Array]";
}

function _getEndpointOptions(endpointArgs) {
  if (endpointArgs.length && _isObjectLiteral(endpointArgs[endpointArgs.length - 1])) {
    return endpointArgs[endpointArgs.length - 1];
  }

  return null;
}

function createEndpointHandler(occClientInstance, endpointMetadata) {
  return async function (...args) {
    const endpointOptions = _getEndpointOptions(arguments);

    let pathParams = [];
    if (endpointMetadata.hasPathParams) {
      pathParams = endpointOptions ? args.slice(0, args.length - 1) : args;
    }

    const requestPath = _parsePath(endpointMetadata.url, pathParams, endpointOptions);
    const requestOptions = { responseType: "json" };

    if (endpointOptions) {
      if (endpointOptions.data) {
        requestOptions.data = endpointOptions.data;
      }

      if (endpointOptions.responseType) {
        requestOptions.responseType = endpointOptions.responseType;
      }

      const extraHeaders = endpointOptions.extraHeaders || {};

      if (endpointOptions.siteId) {
        extraHeaders["x-ccsite"] = endpointOptions.siteId;
      }

      if (endpointOptions.assetLanguage) {
        extraHeaders["x-ccasset-language"] = endpointOptions.assetLanguage;
      }

      requestOptions.headers = Object.assign({}, occClientInstance.connector.defaults.headers.common, extraHeaders);
    }

    if (endpointMetadata.requestType) {
      if (!requestOptions.headers) {
        requestOptions.headers = {};
      }

      requestOptions.headers["Content-Type"] = endpointMetadata.requestType;
    }

    try {
      const response = await occClientInstance.connector({
        url: requestPath,
        method: endpointMetadata.method.toLowerCase(),
        ...requestOptions,
      });

      if (response.data.length && response.data.indexOf("<title>Application Unavailable</title>")) {
        throw new OccEndpointError(
          'OCC server might be down (endpoint returning "Application Unavailable").',
          response
        );
      }

      return response.data;
    } catch (e) {
      const response = e && e.response;
      let message = e.message;

      if (response && response.data && response.data.errorCode && response.data.message) {
        message = `OCC Error ${response.data.errorCode}: ${response.data.message}`;
      }

      throw new OccEndpointError(message, response);
    }
  };
}

async function loadEndpoints(occConnector, apiType) {
  const response = await occConnector.get(`/${apiType}/v1/registry`);

  if (response.data.indexOf && response.data.indexOf("<title>Application Unavailable</title>")) {
    throw new OccEndpointError('OCC server might be down (endpoint returning "Application Unavailable").', response);
  }

  if (apiType === OccApiType.COMMERCE_ADMIN) {
    return {
      ...response.data.endpointMap,
      ..._guidedSearchAdminEndpoints,
      ..._extensionServerAdminEndpoints,
    };
  } else {
    return response.data.endpointMap;
  }
}

async function getOccVersion(occConnector, apiType) {
  const response = await occConnector.get(`/${apiType}/v1/verify`, {
    validateStatus: function (status) {
      return status >= 0 && status < Number.POSITIVE_INFINITY;
    },
  });

  return response.headers["oraclecommercecloud-version"];
}

module.exports = {
  createEndpointHandler,
  loadEndpoints,
  getOccVersion,
};
