module.exports = (array, key, transformObjectCallback) => {
  const result = {};
  if (!array) {
    return result;
  }
  for (const item of array) {
    result[item[key]] = transformObjectCallback
      ? transformObjectCallback(item)
      : item;
  }

  return result;
};
