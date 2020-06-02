/**
 * Request the extension server to restart its workers.
 *
 * @param {*} occClient An OCC client instance.
 */
async function requestRestart(occClient) {
  // I need to send an empty body so that axios sends the Content-Type
  // as application/json. Any other Content-Type other than json makes
  // the endpoint to return HTTP 415.
  await occClient.doServerRestart({ data: {} });
}

/**
 * Push Commerce server configuration to the extension server.
 *
 * @param {*} occClient An OCC client instance.
 */
async function pushAdminConfigs(occClient) {
  await occClient.doServerPush();
}

module.exports = {
  requestRestart,
  pushAdminConfigs,
};
