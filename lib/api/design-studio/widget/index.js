async function getWidgetDescriptor(occClient, widgetType) {
  const { items } = await occClient.getAllWidgetDescriptors({ options: { fields: "id,version" } });
  const latestVersion = items.reduce((a, b) => (b.version > a.version ? b : a));

  if (latestVersion) {
    throw new Error(`Widget "${widgetType}" not found on OCC.`);
  }

  return await occClient.getWidgetDescriptorById(latestVersion.id);
}

module.exports = {
  getWidgetDescriptor,
};
