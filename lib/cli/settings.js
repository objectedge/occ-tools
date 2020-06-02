const { join } = require("path");
const { exists, readJson, outputJson } = require("fs-extra");

const _homeFolderPath = join(process.env[process.platform === "win32" ? "USERPROFILE" : "HOME"], ".occ-tools");
const _settingsFilePath = join(_homeFolderPath, "settings.json");

let _settingsLoaded = false;
let _settings = {};

function getHomePath() {
  return _homeFolderPath;
}

function getSetting(settingId) {
  return _settings[settingId];
}

async function setSetting(settingId, settingValue) {
  _settings[settingId] = settingValue;
  await outputJson(_settingsFilePath, _settings);
}

async function loadSettings() {
  if (!_settingsLoaded) {
    try {
      _settingsLoaded = true;

      if (await exists(_settingsFilePath)) {
        _settings = await readJson(_settingsFilePath);
      } else {
        _settings = {};
        await outputJson(_settingsFilePath, _settings);
      }
    } catch (e) {
      _settingsLoaded = false;
      throw new Error(`Cannot load settings: ${e.message}`);
    }
  }
}

module.exports = {
  getSetting,
  setSetting,
  getHomePath,
  loadSettings,
};
