const fs = require('fs-extra');

module.exports = async (filePath) => {
  const content = await fs.readFile(filePath);

  return JSON.parse(content);
};
