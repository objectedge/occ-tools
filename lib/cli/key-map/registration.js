const _keyMapStack = [];

const keyMapStack = {
  getCurrent: () => _keyMapStack[_keyMapStack.length - 1],
  push: (...keyMap) => {
    _keyMapStack.push(Object.assign({}, ...keyMap));
  },
  pop: () => _keyMapStack.pop(),
};

module.exports = {
  keyMapStack,
};
