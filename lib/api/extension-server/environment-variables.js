/**
 * Get all created extension server environment variables.
 *
 * @param {*} occClient An OCC Client instance.
 */
async function getCreatedVariables(occClient) {
  const { items: createdVars } = await occClient.listExtensionVariable();

  return createdVars;
}

/**
 * Remove an extension server environment variable.
 *
 * @param {String} variableId The ID of the variable to be removed.
 */
async function removeVariable(occClient, variableId) {
  // This is just to check if the variable exists. Will throw an error otherwise.
  // This needs to be done because the doDeleteExtensionVariable does nothing
  // if the variable does not exist, so giving the wrong impression it was deleted.
  await occClient.doGetExtensionVariable(variableId, { options: { fields: "id" } });
  await occClient.doDeleteExtensionVariable(variableId);
}

/**
 * Set an extension server environment variable. The variable will be created if it doesn't
 * exist yet.
 *
 * @param {*} occClient An OCC Client instance.
 * @param {String} variableName The variable name.
 * @param {String} variableValue The variable value.
 */
async function setVariable(occClient, variableName, variableValue) {
  const { items: createdVars } = await occClient.listExtensionVariable({ options: { fields: "id,name" } });
  const existingVariable = createdVars.find((v) => v.name === variableName);

  if (existingVariable) {
    await occClient.doUpdateExtensionVariable(existingVariable.id, {
      data: { name: existingVariable.name, value: variableValue },
    });
  } else {
    await occClient.doCreateExtensionVariable({ data: { name: variableName, value: variableValue } });
  }
}

module.exports = {
  getCreatedVariables,
  removeVariable,
  setVariable,
};
