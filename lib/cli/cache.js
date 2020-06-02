const { join, parse } = require("path");

const { walkDir } = require("../utils/fs");
const { getHomePath } = require("./settings");
const { exists, readJson, outputJson } = require("fs-extra");

const _cacheRootFolder = join(getHomePath(), "cache");

class InMemoryCache {
  constructor() {
    this._cache = {};
  }

  has(key) {
    return Object.keys(this._cache).includes(key);
  }

  get(key) {
    return this._cache[key];
  }

  async set(key, value) {
    this._cache[key] = value;
  }
}

class MultiFileCache extends InMemoryCache {
  constructor(relativeFolderPath) {
    super();
    this._folderPath = join(_cacheRootFolder, relativeFolderPath);
    this._initialized = false;
  }

  async load() {
    if (!this._initialized) {
      try {
        this._initialized = true;
        if (await exists(this._folderPath)) {
          const cacheEntryFiles = await walkDir(this._folderPath);

          await Promise.all(
            cacheEntryFiles
              .map((entry) => {
                const pathInfo = parse(entry.slice(this._folderPath.length));
                return { key: join(pathInfo.dir, pathInfo.name), path: entry };
              })
              .map(async (cacheEntry) => {
                const cacheEntryValue = await readJson(cacheEntry.path);
                this._cache[cacheEntry.key] = cacheEntryValue;
              })
          );
        }
      } catch (e) {
        this._initialized = false;
        throw e;
      }
    }
  }

  async _persist(entryKey, entryValue) {
    const cacheEntryFile = join(this._folderPath, `${entryKey}.json`);
    await outputJson(cacheEntryFile, entryValue);
  }

  has(key) {
    return Object.keys(this._cache).includes(key);
  }

  get(key) {
    return this._cache[key];
  }

  async set(key, value) {
    this._cache[key] = value;
    await this._persist(key, value);
  }
}

class SingleFileCache extends InMemoryCache {
  constructor(relativeFilePath) {
    super();
    this._filePath = join(_cacheRootFolder, relativeFilePath);
    this._initialized = false;
  }

  async _persist() {
    await outputJson(this._filePath, this._cache);
  }

  async load() {
    if (!this._initialized) {
      try {
        this._initialized = true;
        if (await exists(this._filePath)) {
          this._cache = await readJson(this._filePath);
        } else {
          await this._persist();
        }
      } catch (e) {
        this._initialized = false;
        throw e;
      }
    }
  }

  has(key) {
    return Object.keys(this._cache).includes(key);
  }

  get(key) {
    return this._cache[key];
  }

  async set(key, value) {
    this._cache[key] = value;
    await this._persist();
  }
}

module.exports = {
  InMemoryCache,
  MultiFileCache,
  SingleFileCache,
};
