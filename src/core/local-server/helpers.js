exports.isEmptyObject = obj => {
  return Object.keys(obj).length === 0;
}

exports.isObject = obj => {
  return Object.prototype.toString.call(obj) == "[object Object]";
}
