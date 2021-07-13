module.exports = (map, key) => {
  if (!map) {
    return [];
  }

  return Object.keys(map).map(mapKey => {
    return {
      [key]: mapKey,
      ...map[mapKey]
    };
  });
};
