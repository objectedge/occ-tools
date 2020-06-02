const colors = require("./ui/theme");
const Spinner = require("./ui/output/Spinner");
const Question = require("./ui/input/Question");
const OccClient = require("../api/occ-client");
const OccApiType = require("../api/occ-client/OccApiType");
const ChoiceList = require("./ui/input/ChoiceList");
const TextOutput = require("./ui/output/TextOutput");
const Confirmation = require("./ui/input/Confirmation");
const { executionContext } = require("./execution-context");
const { getSetting, setSetting } = require("./settings");

const _credentialsTypeChoices = {
  storefront: [
    { value: "password", description: "Use my email/password that I use to sign in on the storefront" },
    { value: "bearerToken", description: "I already have the bearer token, so just use it directly" },
  ],
  admin: [
    { value: "password", description: "Use my username/password that I have to access the admin panel" },
    { value: "applicationKey", description: "Use the application key that was generated on the admin panel" },
    { value: "bearerToken", description: "I already have the bearer token, so just use it directly" },
  ],
};

async function _askUserForCredentials(serverType, environment) {
  TextOutput.show(`Please confirm the credentials to access the ${serverType} for ${colors.bold(environment.url)}:\n`);
  const credentialsType = await new ChoiceList(
    "What credentials type that will be used:",
    _credentialsTypeChoices[serverType]
  ).ask();

  const credentials = { type: credentialsType };

  switch (credentialsType) {
    case "password":
      credentials.username = await new Question("Enter your username").ask();
      credentials.password = await new Question("Enter your password", { maskOutput: true }).ask();

      if (serverType === "admin") {
        credentials.isMfaEnabled = await new Confirmation(
          "Is using multi-factor authentication enabled for the environment?",
          { defaultAnswer: Confirmation.Yes }
        ).ask();

        if (credentials.isMfaEnabled) {
          credentials.isTotpAlwaysTheSame = await new Confirmation("Will this passcode be always the same?").ask();

          if (credentials.isTotpAlwaysTheSame) {
            credentials.totpCode = await new Question("Enter the one-time passcode:").ask();
          }
        }
      }
      break;
    case "applicationKey":
      credentials.applicationKey = await new Question("Enter the application key:").ask();
      break;
    case "bearerToken":
      credentials.bearerToken = await new Question("Enter the bearer token:").ask();
      break;
    default:
      throw new Error(`Unknown credentials type: "${credentialsType}".`);
  }

  return credentials;
}

const _clientCache = {};

async function getOccClientForCurrentEnv(apiType) {
  const { project, environment } = executionContext().get();

  if (!project || !environment) {
    throw new Error("No execution context defined.");
  }

  const entryId = `${project.descriptor.name}:${environment.name}:${apiType}`;

  if (!_clientCache[entryId]) {
    _clientCache[entryId] = new OccClient(apiType, environment.url);
  }

  const occClient = _clientCache[entryId];

  if (!occClient.isConnected()) {
    let credentials = getSetting(`${entryId}:credentials`);

    if (!credentials) {
      Spinner.hide();
      const serverType = apiType === OccApiType.COMMERCE_STOREFRONT ? "storefront" : "admin";
      credentials = await _askUserForCredentials(serverType, environment);
      await setSetting(`${entryId}:credentials`, credentials);
      Spinner.show();
    }

    if (credentials.isMfaEnabled && !credentials.isTotpAlwaysTheSame) {
      Spinner.hide();
      credentials.totpCode = await new Question(
        `Enter the one-time passcode (api: ${colors.bold(apiType)}, url: ${colors.bold(environment.url)}):`
      ).ask();
      Spinner.show();
    }

    if (credentials.type === "bearerToken") {
      Spinner.hide();
      credentials.bearerToken = await new Question(
        `Enter the bearer token (api: ${colors.bold(apiType)}, url: ${colors.bold(environment.url)}):`
      ).ask();
      Spinner.show();
    }

    await occClient.connect(credentials);
  }

  return occClient;
}

module.exports = {
  getOccClientForCurrentEnv,
};
