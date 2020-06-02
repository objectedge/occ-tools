const OccApiType = require("./OccApiType");
const { stringify } = require("querystring");

function _getLoginEndpoint(occClient, crendentialsType) {
  let loginEndpoint = "mfalogin";
  const apiType = occClient.apiType;

  if (
    crendentialsType !== "password" ||
    apiType === OccApiType.COMMERCE_AGENT ||
    apiType === OccApiType.COMMERCE_STOREFRONT
  ) {
    loginEndpoint = "login";
  }

  if (!occClient.serverSupports(loginEndpoint)) {
    throw new Error(`OCC "${occClient.apiType}" profile does not support the "${loginEndpoint}" endpoint.`);
  }

  return occClient[loginEndpoint];
}

function _buildLoginData(occClient, credentials) {
  const loginData = {};

  if (credentials.type === "applicationKey") {
    loginData.grant_type = "client_credentials";
  } else {
    loginData.grant_type = "password";
    loginData.username = credentials.username;
    loginData.password = credentials.password;

    if (occClient.apiType === OccApiType.COMMERCE_ADMIN && credentials.isMfaEnabled) {
      loginData.totp_code = credentials.totpCode;
    }
  }

  return stringify(loginData);
}

function _getExtraHeaders(credentials) {
  const extraHeaders = { "Content-Type": "application/x-www-form-urlencoded" };

  if (credentials.type === "applicationKey") {
    extraHeaders.Authorization = credentials.applicationKey;
  }

  return extraHeaders;
}

async function _callLoginEndpoint(occClient, credentials) {
  const loginEndpoint = _getLoginEndpoint(occClient, credentials.type);

  try {
    const response = await loginEndpoint({
      data: _buildLoginData(occClient, credentials),
      extraHeaders: _getExtraHeaders(credentials),
    });

    if (!response.access_token) {
      throw new Error(`Access token not found in the login response for the "${occClient.apiType}" API.`);
    }

    return response.access_token;
  } catch (e) {
    if (e.data && e.data.error_description) {
      throw new Error(e.data.error_description);
    } else {
      throw e;
    }
  }
}

async function authenticateUser(occClient, credentials) {
  switch (credentials.type) {
    case "bearerToken":
      return `Bearer ${credentials.bearerToken}`;
    case "applicationKey":
    case "password":
      return `Bearer ${await _callLoginEndpoint(occClient, credentials)}`;

    default:
      throw new Error(`Unknown OCC crendentials type provided: ${credentials}`);
  }
}

function createAuthenticationRefreshTimer(occConnector, apiType, refreshInterval = 180) {
  return setInterval(async () => {
    const response = await occConnector.post(`/${apiType}/v1/refresh`);

    if (!response.access_token) {
      throw new Error(`Access token not found in the refresh response for the "${apiType}" API.`);
    }

    occConnector.defaults.headers.common.Authorization = `Bearer ${response.access_token}`;
  }, refreshInterval * 1000);
}

function getOccAccessTokenDetails(token) {
  return JSON.parse(Buffer.from(token.split(".")[1], "base64"));
}

module.exports = {
  authenticateUser,
  createAuthenticationRefreshTimer,
  getOccAccessTokenDetails,
};
