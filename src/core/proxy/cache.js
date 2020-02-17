var path = require('path');
var fs = require('fs-extra');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var crypto = require('crypto');
var winston = require('winston');
var config = require('../config');

function Cache(options) {
  EventEmitter.call(this);

  options = options || {};

  var disableCacheOption = options.disableCache ? options.disableCache.split(',') : false;

  this.options = {
    cacheDir: options.cacheDir || config.proxy.cacheDir,
    wipeCacheOnExit: typeof options.wipeCacheOnExit !== 'undefined' ? options.wipeCacheOnExit : true,
    enabled: true,
    disableCache: disableCacheOption
  };

  this.cacheList = [];

  fs.ensureDirSync(this.options.cacheDir);

  //closing app
  process.on('exit', this.onClose.bind(this));

  //ctrl+c
  process.on('SIGINT', this.onCtrlC.bind(this));
}
util.inherits(Cache, EventEmitter);

Cache.prototype.cacheFileName = function(id, type) {
  type = type || '.json'
  var fileHash = crypto.createHash('md5').update(id).digest("hex");
  var fileName = fileHash + type;

  return fileName;
};

Cache.prototype.fullFileCachePath = function(id, type) {
  var fileName = this.cacheFileName(id, type);
  var cacheDir = this.options.cacheDir;
  var filePath = path.join(cacheDir, fileName);

  try {
    fs.accessSync(filePath, fs.F_OK);
    return {
      exists: true,
      path: filePath
    };
  } catch (e) {
    return {
      exists: false,
      path: filePath
    }
  }
};

Cache.prototype.set = function (id, data, headers, options) {
  var currentInstance = this;

  if(!currentInstance.options.enabled) {
    return this;
  }

  var jsonCacheFile = this.fullFileCachePath(id);
  var jsonFile;
  var dataFile = this.fullFileCachePath(id, '.dat');

  options = options || {};
  options.saveAsBuffer = typeof options.saveAsBuffer !== 'undefined' ? options.saveAsBuffer : true;
  options.callback = options.callback || function () {};

  var callback = options.callback;

  var cacheObject = {
    key: id,
    dir: jsonCacheFile.path,
    date: new Date(),
    headers: headers,
    dataFile: dataFile.path,
    active: true
  };

  if(currentInstance.options.disableCache) {
    currentInstance.options.disableCache.forEach(function (disableCachePattern) {
      var regex = new RegExp(disableCachePattern, 'g');

      if(regex.test(id)) {
        cacheObject.active = false;
      }
    });
  }

  if(!jsonCacheFile.exists) {
    currentInstance.cacheList.push(cacheObject);
  } else {
    jsonFile = fs.readJsonSync(jsonCacheFile.path);
    cacheObject.active = jsonFile.active;
  }

  var writeCache = function (action) {
    fs.writeJson(jsonCacheFile.path, cacheObject, { spaces: 2 }, callback);

    if(options.saveAs === 'buffer') {
      var wstream = fs.createWriteStream(dataFile.path);
      wstream.write(data);
      wstream.end();
    } else if(options.saveAs === 'json') {
      fs.writeJson(dataFile.path, data, { spaces: 2 });
    } else {
      fs.writeFile(dataFile.path, data, { encoding: 'utf8' });
    }

    this.emit('cache' + action, cacheObject);

    if(typeof callback === 'function') {
      callback.call(this, cacheObject);
    }
  };

  if(jsonCacheFile.exists && !jsonFile.active) {
    return this;
  }

  if(jsonCacheFile.exists && options.update) {
    writeCache.call(this, 'Updated');
    return this;
  }

  writeCache.call(this, 'Created');
  return this;
};

Cache.prototype.updateJSONFile = function (id, cacheObject, callback) {
  callback = callback || function (){};

  var filePath = this.fullFileCachePath(id);

  if(filePath.exists) {
    fs.writeJson(filePath.path, cacheObject, { spaces: 2 }, function () {
      callback(null, 'done');
    });
    return true;
  }

  return callback(true, 'doesnt exist');
};

Cache.prototype.updateFileContent = function (id, content, callback) {
  callback = callback || function (){};
  var filePath = this.fullFileCachePath(id);
  var dataFile = this.fullFileCachePath(id, '.dat');

  if(filePath.exists) {
    fs.writeFile(dataFile.path, content, function () {
      callback(null, 'done');
    });
    return true;
  }

  return callback(true, 'doesnt exist');
};

Cache.prototype.get = function (id, ignoreDisabled) {
  var currentInstance = this;
  ignoreDisabled = ignoreDisabled || false;

  if(!currentInstance.options.enabled) {
    return false;
  }

  var filePath = this.fullFileCachePath(id);

  if(filePath.exists) {
    var jsonFile = fs.readJsonSync(filePath.path);

    if(!jsonFile.active && !ignoreDisabled) {
      return false;
    }

    jsonFile.getData = function (returnString) {
      return currentInstance.readData(jsonFile.key, returnString);
    };

    return jsonFile;
  }

  return false;
};

Cache.prototype.getCacheList = function () {
  return this.cacheList;
};

Cache.prototype.pauseCache = function (key, callback) {
  var currentInstance = this;
  callback = callback || function () {};

  if(typeof key !== 'undefined') {
    currentInstance.cacheList.some(function (cache) {
      if(cache.key === key) {
        cache.active = false;
        currentInstance.updateJSONFile(key, cache, callback);
        return true;
      }
    });

    return;
  }

  this.cacheList.forEach(function (cache) {
    cache.active = false;
    currentInstance.updateJSONFile(key, cache);
  });
};

Cache.prototype.resumeCache = function (key, callback) {
  var currentInstance = this;
  callback = callback || function () {};

  if(typeof key !== 'undefined') {
    this.cacheList.some(function (cache) {
      if(cache.key === key) {
        cache.active = true;
        currentInstance.updateJSONFile(key, cache, callback);
        return true;
      }
    });

    return;
  }

  this.cacheList.forEach(function (cache) {
    cache.active = true;
    currentInstance.updateJSONFile(key, cache);
  });
};

Cache.prototype.disable = function () {
  this.options.enabled = false;
};

Cache.prototype.enable = function () {
  this.options.enabled = true;
};

Cache.prototype.currentStatus = function () {
  return this.options.enabled;
};

Cache.prototype.readData = function (id, returnString) {
  var filePath = this.fullFileCachePath(id, '.dat');

  if(filePath.exists) {
    if(!returnString) {
      return fs.readFileSync(filePath.path);
    }

    return fs.readFileSync(filePath.path, 'utf8');
  }

  return false;
};

Cache.prototype.wipe = function (id, callback) {
  var currentInstance = this;

  var cacheDir = this.options.cacheDir;
  callback = callback || function () {};

  if(typeof id === 'function') {
    callback = id;
    id = null;
  }

  if(!id) {
    fs.emptydirSync(cacheDir);
    currentInstance.cacheList = [];

    this.emit('cacheWiped', null, cacheDir);
    callback.call(this, null, cacheDir);
  } else {
    var filePath = this.fullFileCachePath(id);

    if(filePath.exists) {
      var datFilePath = this.fullFileCachePath(id, '.dat');

      fs.removeSync(filePath.path);

      if(datFilePath.exists) {
        fs.removeSync(datFilePath.path);
      }

      currentInstance.cacheList.some(function (cache, index) {
        if(cache.key === id) {
          currentInstance.cacheList.splice(index, 1);
          return true;
        }
      });

      this.emit('cacheWiped', null, filePath.path);
      callback.call(this, null, filePath.path);
    } else {
      winston.warn('it was not possible to delete that file because it doesnt exist');
      this.emit('cacheWiped', 'file doesnt exist', null);
      callback.call(this, 'file doesnt exist', null);
    }

  }
};

Cache.prototype.wipeCacheOnExit = function (wipe) {
  this.options.wipeCacheOnExit = wipe;
};

Cache.prototype.onClose = function () {
  winston.info("\n\n\n" +
              "##########################################################################\n" +
              "#### Hey! Remember to upload your widgets to OCC if they're complete! ####\n" +
              "##########################################################################\n\n\n" );

  if(this.options.wipeCacheOnExit) {
    this.wipe();
  }

  this.emit('close');
};

Cache.prototype.onCtrlC = function () {
  this.emit('ctrlc');
  process.exit();
};

Cache.prototype.isJSON = function (data) {
  try {
    JSON.parse(data);
    return true;
  } catch (e) {
    return false;
  }
};

module.exports = Cache;
