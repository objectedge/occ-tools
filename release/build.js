var path = require('path');
var fs = require('fs');
var spawn = require('child_process').spawn;

/**
 * Output
 */
var os = process.platform;
var currentOccToolsVersion = require(path.join(__dirname, '..', 'package.json')).version;
var distPath = path.join(__dirname, '..', 'dist');
var zipFileSuffix = currentOccToolsVersion + '-' + os + (os !== 'win32' ? '.gz' : '.zip');
var zipFilePath = path.join(distPath, 'occ-tools-cli-' + zipFileSuffix);
var binFile = os !== 'win32' ? 'occ-tools-cli' : 'occ-tools-cli.exe';
var binFilePath = path.join(distPath, binFile);

/**
 * Entry
 */
var mainApplicationEntry = path.join(__dirname, '..', 'index.js');

function runNodeCompiler() {
  var child = spawn('nodec', [
    '--output=' + binFilePath,
    '--auto-update-url=http://occ-tools-app.herokuapp.com/check-version/' + os + '/' + currentOccToolsVersion,
    '--auto-update-base=' + currentOccToolsVersion,
    mainApplicationEntry
  ]);

  child.stdout.setEncoding('utf8');

  child.stdout.on('data', function (chunk) {
    console.log(chunk.toString());
  });
  
  child.stderr.on('data', function (data) {
    console.error(data.toString());
  });
  
  child.on('close', function () {
    console.warn('Build finished!');
    createZipFile();
  });
}

function createZipFile() {
  var child = spawn('gzip', [
    '-k',
    '-S-' + zipFileSuffix,
    binFilePath
  ]);

  child.stdout.setEncoding('utf8');

  child.stdout.on('data', function (chunk) {
    console.log(chunk.toString());
  });
  
  child.stderr.on('data', function (data) {
    console.error(data.toString());
  });
  
  child.on('close', function () {
    console.warn('Zip File Created!');
  });
}

fs.lstat(distPath, function (error, stats) {
  if(error && error.code === 'ENOENT') {
    fs.mkdirSync(distPath);
    runNodeCompiler();
    return;
  }

  // Empty dist dir
  fs.readdir(distPath, function (error, files) {
    if(error) {
      throw error;
    }

    var totalFiles = files.length;

    if(!totalFiles) {
      runNodeCompiler();
      return;
    }

    var file;
    var count = 0;

    for (; count < totalFiles; count++) {
      fs.unlink(path.join(distPath, files[count]), function (error) {
        if(error) {
          throw error;
        }

        if(totalFiles === count) {
          runNodeCompiler();
        }
      });
    }
  });
});