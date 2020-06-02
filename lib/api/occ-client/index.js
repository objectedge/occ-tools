const axios = require("axios").default;
const OccApiType = require("./OccApiType");
const { CookieJar } = require("tough-cookie");
const { OccClientError } = require("./errors");
const { createEndpointHandler, loadEndpoints, getOccVersion } = require("./endpoints");
const { authenticateUser, createAuthenticationRefreshTimer, getOccAccessTokenDetails } = require("./authentication");

const _profileTypes = {
  [OccApiType.COMMERCE_ADMIN]: "adminUI",
  [OccApiType.COMMERCE_AGENT]: "agentUI",
  [OccApiType.COMMERCE_STOREFRONT]: "storeUI",
};

function _getCookieString(baseUrl, cookieJar) {
  return new Promise((resolve, reject) => {
    cookieJar.getCookieString(baseUrl, (err, cookieString) => {
      if (err) {
        return reject(new Error(`Cannot inject cookies into request. ${err.message}`));
      }

      resolve(cookieString);
    });
  });
}

function _storeCookie(cookie, baseUrl, cookieJar) {
  return new Promise((resolve, reject) => {
    cookieJar.setCookie(cookie, baseUrl, (err) => {
      if (err) {
        reject(err);
      }

      resolve();
    });
  });
}

class OccClient {
  constructor(apiType, occHostUrl, settings = OccClient.defaultSettings) {
    this._cookieJar = new CookieJar();
    this._availableEndpoints = [];
    this._apiType = apiType;
    this._clientSettings = Object.assign({}, OccClient.defaultSettings, settings);
    this._connector = axios.create({
      baseURL: occHostUrl,
      withCredentials: true,
      headers: {
        "x-ccsite": this._clientSettings.siteId,
        "x-ccasset-language": this._clientSettings.language,
        "x-ccprofiletype": _profileTypes[apiType],
      },
    });

    this._connector.interceptors.request.use(
      async (config) => {
        const cookieString = await _getCookieString(occHostUrl, this._cookieJar);

        if (cookieString) {
          config.headers.cookie = cookieString;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    this._connector.interceptors.response.use(
      async (response) => {
        const responseCookies = response.headers["set-cookie"] || response.headers["Set-Cookie"] || [];

        await Promise.all(
          responseCookies.map(async (cookie) => {
            await _storeCookie(cookie, occHostUrl, this._cookieJar);
          })
        );

        return response;
      },
      (error) => Promise.reject(error)
    );
  }

  static get defaultSettings() {
    return {
      siteId: "siteUS",
      language: "en",
    };
  }

  get connector() {
    return this._connector;
  }

  get occVersion() {
    return this._occVersion;
  }

  get apiType() {
    return this._apiType;
  }

  get availableEndpoints() {
    return this._availableEndpoints;
  }

  isConnected() {
    return this._connected;
  }

  serverSupports(...endpointIds) {
    return endpointIds.every((endpointId) => this.availableEndpoints.includes(endpointId));
  }

  async _loadEndpoints() {
    try {
      this._occVersion = await getOccVersion(this._connector, this._apiType);

      const endpointMap = await loadEndpoints(this._connector, this._apiType);
      this._availableEndpoints = Object.keys(endpointMap).sort();

      for (const endpointName of this._availableEndpoints) {
        this[endpointName] = createEndpointHandler(this, endpointMap[endpointName]);
      }
    } catch (e) {
      this._connected = false;
      throw new OccClientError(`Cannot initialize OCC Client. ${e.message}`, e);
    }
  }

  async _authenticateUser(credentials) {
    try {
      // Two things to observe here: first, I need to multiply the JWT "exp" claim by 1000
      // to get the correct unix epoch otherwise it will give a wrong date.
      // Second, for the refresh interval I'm dividing the delta by 3 to have sort of a safe net.
      // In a case of failure from the refresh endpoint I'll have two more chances.
      const accessToken = await authenticateUser(this, credentials);
      const now = new Date();
      const tokenDetails = getOccAccessTokenDetails(accessToken);
      const expiryDate = new Date(tokenDetails.exp * 1000);
      const refreshInterval = Math.floor((expiryDate - now) / 3);

      this._connector.defaults.headers.common.Authorization = accessToken;
      this._authenticationRefreshTimer = createAuthenticationRefreshTimer(
        this._connector,
        this._apiType,
        refreshInterval
      );
    } catch (e) {
      throw new OccClientError(`Cannot authenticate user. ${e.message}`, e);
    }
  }

  async connect(credentials) {
    if (this._connected) {
      return;
    }

    try {
      this._connected = true;
      await this._loadEndpoints();
      await this._authenticateUser(credentials);
    } catch (e) {
      this._connected = false;
      throw e;
    }
  }

  async disconnect() {
    if (!this._connected) {
      return;
    }

    if (this._authenticationRefreshTimer) {
      clearInterval(this._authenticationRefreshTimer);
      this._authenticationRefreshTimer = null;
    }

    await this._cookieJar.removeAllCookies();
    this._connected = false;
  }

  async doGenericRequest(path, requestOptions = {}) {
    const options = {
      method: requestOptions.method || "get",
      responseType: requestOptions.responseType || "json",
    };

    if (requestOptions.data) {
      options.data = requestOptions.data;
    }

    if (requestOptions.extraHeaders) {
      options.headers = Object.assign({}, this._connector.defaults.headers.common, requestOptions.extraHeaders);
    }

    if (requestOptions.siteId) {
      options.headers["x-ccsite"] = requestOptions.siteId;
    }

    if (requestOptions.siteLanguage) {
      options.headers["x-ccasset-language"] = requestOptions.siteLanguage;
    }

    const response = await this._connector({
      url: path,
      ...options,
    });

    // if (response.data.length && response.data.indexOf('<title>Application Unavailable</title>')) {
    //   throw new OccEndpointError('OCC server might be down (endpoint returning "Application Unavailable").', response)
    // }

    return response.data;
  }
}

module.exports = OccClient;
