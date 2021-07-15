module.exports = (array, key, removeKey) => {
  const result = {};
  if (!array) {
    return result;
  }

  for (const item of array) {
    const newItem = { ...item };

    if (removeKey) {
      delete newItem[key];
    }

    result[item[key]] = { ...newItem };
  }

  return result;
};
