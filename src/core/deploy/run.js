const cTable = require('console.table');
var util = require('util');
var async = require('async');
var winston = require('winston');

var Widget = require('../widget');
var Extension = require('../extension');
var AppLevel = require('../app-level');
var Theme = require('../theme');
var Publish = require('../publish');
var Index = require('../index');
var ServerSideExtension = require('../server-side-extension');
var Files = require('../files');
var Search = require('../search');
var Stack = require('../stack');
var Email = require('../email');

module.exports = function(deployInstructions, callback) {
  var self = this;

  var errors = [];

  deployInstructions.operations.unshift({
    operation: 'info',
    type: 'widget'
  });

  var widgetsInfo = {};
  async.eachLimit(
    deployInstructions.operations,
    1,
    function(operation, callback) {
      operation.options = operation.options || {};
      switch (operation.type) {
        case 'publish':
          if (operation.operation === 'trigger') {
            triggerPublish(callback, errors, operation);
          } else {
            operationNotSupported(errors, operation);
            callback();
          }
          break;
        case 'index':
          if (operation.operation === 'trigger') {
            triggerIndex(callback, errors, operation);
          } else {
            operationNotSupported(errors, operation);
            callback();
          }
          break;
        case 'widget':
          switch (operation.operation) {
            case 'info':
              widgetInfo(widgetsInfo, callback, errors, operation);
              break;
            case 'upload':
              if (Array.isArray(operation.id)) {
                widgetsUpload(operation, errors, widgetsInfo, callback);
              } else {
                widgetUpload(callback, errors, operation, widgetsInfo);
              }
              break;
            default:
              operationNotSupported(errors, operation);
              callback();
          }
          break;
        case 'theme':
          switch (operation.operation) {
            case 'upload':
              uploadTheme(callback, errors, operation);
              break;
            case 'generate':
              generateTheme(callback, errors, operation);
              break;
            case 'build':
              buildTheme(callback, errors, operation);
              break;
            default:
              operationNotSupported(errors, operation);
              callback();
          }
          break;
        case 'files':
          if (operation.operation === 'upload') {
            uploadFiles(callback, errors, operation);
          } else {
            operationNotSupported(errors, operation);
            callback();
          }
          break;
        case 'search':
          if (operation.operation === 'upload') {
            uploadSearch(callback, errors, operation);
          } else {
            operationNotSupported(errors, operation);
            callback();
          }
          break;
        case 'stack':
          if (operation.operation === 'upload') {
            uploadStack(callback, errors, operation);
          } else {
            operationNotSupported(errors, operation);
            callback();
          }
          break;
        case 'appLevel':
        case 'app-level':
          if (operation.operation === 'upload') {
            uploadAppLevel(callback, errors, operation);
          } else {
            operationNotSupported(errors, operation);
            callback();
          }
          break;
        case 'sse-variables':
          switch (operation.operation) {
            case 'upload':
              uploadSseVariables(callback, errors, operation);
              break;
            case 'delete':
              deleteSseVariable(callback, errors, operation);
              break;
            default:
              operationNotSupported(errors, operation);
              callback();
          }
          break;
        case 'sse':
          switch (operation.operation) {
            case 'upload':
              uploadSse(callback, errors, operation);
              break;
            case 'delete':
              deleteSse(callback, errors, operation);
              break;
            case 'restart':
              restartSse(callback, errors, operation);
              break;
            default:
              operationNotSupported(errors, operation);
              callback();
          }
          break;
        case 'extension':
          if (operation.operation === 'upgrade') {
            if (Array.isArray(operation.id)) {
              upgradeExtensions(callback, errors, operation);
            } else {
              upgradeExtension(callback, errors, operation);
            }
          } else {
            operationNotSupported(errors, operation);
            callback();
          }
          break;
        case 'email':
          if (operation.operation === 'upload') {
            uploadEmail(callback, errors, operation);
          } else {
            operationNotSupported(errors, operation);
            callback();
          }
          break;
        default:
          operationNotSupported(errors, operation);
          callback();
      }
    },
    function(err) {
      if (err) {
        callback(err);
      } else {
        if (errors && errors.length) {
          winston.error('The following errors were found during the deploy');
          console.table(errors);
        } else {
          winston.info('No errors were found during the deploy');
        }
        callback();
      }
    }
  );
};

function widgetsUpload(operation, errors, widgetsInfo, callback) {
  async.eachLimit(
    operation.id,
    1,
    function(widgetId, eachCallback) {
      var op = JSON.parse(JSON.stringify(operation));
      op.id = widgetId;
      widgetUpload(eachCallback, errors, op, widgetsInfo);
    },
    function() {
      callback();
    }
  );
}

function uploadEmail(callback, errors, operation) {
  var email = new Email('admin');
  email.on('complete', function() {
    callback();
  });
  email.on('error', function(err) {
    errors.push({ type: operation.type, id: operation.id, error: err });
    callback();
  });

  operation.options = operation.options || {};
  operation.options.siteId = operation.options.site || 'siteUS';
  operation.options.languageId = operation.options.language || 'en';
  email.upload(operation.id, operation.options);
}

function uploadStack(callback, errors, operation) {
  var stack = new Stack('admin');
  stack.on('complete', function() {
    callback();
  });
  stack.on('error', function(err) {
    errors.push({ type: operation.type, id: operation.id, error: err });
    callback();
  });
  stack.upload(operation.id, {});
}

function uploadSearch(callback, errors, operation) {
  var search = new Search('admin');
  search.on('complete', function() {
    callback();
  });
  search.on('error', function(err) {
    errors.push({ type: operation.type, id: operation.id, error: err });
    callback();
  });
  search.upload(operation.id);
}

function uploadFiles(callback, errors, operation) {
  var files = new Files('admin');
  files.on('complete', function() {
    callback();
  });
  files.on('error', function(err) {
    errors.push({ type: operation.type, id: operation.id, error: err });
    callback();
  });
  files.uploadCommand(operation.id, operation.options);
}

function uploadSse(callback, errors, operation) {
  var sse = new ServerSideExtension('admin');
  sse.on('complete', function() {
    callback();
  });
  sse.on('error', function(err) {
    errors.push({ type: operation.type, id: operation.id, error: err });
    callback();
  });
  sse.upload(operation.id);
}

function deleteSse(callback, errors, operation) {
  var sse = new ServerSideExtension('admin');
  sse.on('complete', function() {
    callback();
  });
  sse.on('error', function(err) {
    errors.push({ type: operation.type, id: operation.id, error: err });
    callback();
  });
  sse.delete(operation.id);
}

function restartSse(callback, errors, operation) {
  var sse = new ServerSideExtension('adminX');
  sse.on('complete', function() {
    callback();
  });
  sse.on('error', function(err) {
    errors.push({ type: operation.type, id: operation.id, error: err });
    callback();
  });
  sse.restart();
}

function uploadSseVariables(callback, errors, operation) {
  var sse = new ServerSideExtension('admin');
  sse.on('complete', function() {
    callback();
  });
  sse.on('error', function(err) {
    errors.push({ type: operation.type, id: operation.id, error: err });
    callback();
  });
  sse.uploadVariables(operation.id, operation.options);
}

function deleteSseVariable(callback, errors, operation) {
  var sse = new ServerSideExtension('admin');
  sse.on('complete', function() {
    callback();
  });
  sse.on('error', function(err) {
    errors.push({ type: operation.type, id: operation.id, error: err });
    callback();
  });
  sse.deleteVariable(operation.id);
}

function triggerIndex(callback, errors, operation) {
  var index = new Index('admin');
  index.on('complete', function() {
    callback();
  });
  index.on('error', function(err) {
    errors.push({ type: operation.type, id: operation.type, error: err });
    callback();
  });
  index.trigger(operation.options.type || 'partial');
}

function triggerPublish(callback, errors, operation) {
  var publish = new Publish('admin');
  publish.on('complete', function() {
    callback();
  });
  publish.on('error', function(err) {
    errors.push({ type: operation.type, id: operation.type, error: err });
    callback();
  });
  publish.trigger();
}

function buildTheme(callback, errors, operation) {
  var theme = new Theme('admin', operation.options);
  theme.on('complete', function() {
    callback();
  });
  theme.on('error', function(err) {
    errors.push({ type: operation.type, id: operation.id, error: err });
    callback();
  });
  theme.build(operation.id);
}

function uploadTheme(callback, errors, operation) {
  var theme = new Theme('admin', operation.options);
  theme.on('complete', function() {
    callback();
  });
  theme.on('error', function(err) {
    errors.push({ type: operation.type, id: operation.id, error: err });
    callback();
  });
  theme.upload(operation.id);
}

function generateTheme(callback, errors, operation) {
  var theme = new Theme('admin', operation.options);
  theme.on('complete', function() {
    callback();
  });
  theme.on('error', function(err) {
    errors.push({ type: operation.type, id: operation.type, error: err });
    callback();
  });
  theme.generate();
}

function uploadAppLevel(callback, errors, operation) {
  var appLevel = new AppLevel();
  appLevel.on('complete', function() {
    callback();
  });
  appLevel.on('error', function(err) {
    errors.push({ type: operation.type, id: operation.id, error: err });
    callback();
  });
  appLevel.upload(operation.id, operation.options);
}

function upgradeExtensions(callback, errors, operation) {
  async.eachLimit(
    operation.id,
    1,
    function(extensionId, eachCallback) {
      var op = JSON.parse(JSON.stringify(operation));
      op.id = extensionId;
      upgradeExtension(eachCallback, errors, op);
    },
    function() {
      callback();
    }
  );
}

function upgradeExtension(callback, errors, operation) {
  var extension = new Extension();
  extension.on('complete', function() {
    callback();
  });
  extension.on('error', function(err) {
    errors.push({ type: operation.type, id: operation.id, error: err });
    callback();
  });
  extension.upgrade(operation.id, operation.options);
}

function widgetUpload(callback, errors, operation, widgetsInfo) {
  var widget = new Widget();
  widget.on('complete', function() {
    callback();
  });
  widget.on('error', function(err) {
    errors.push({ type: operation.type, id: operation.id, error: err });
    callback();
  });
  widget.upload(
    operation.id,
    Object.assign(operation.options || {}, widgetsInfo)
  );
}

function widgetInfo(info, callback, errors, operation) {
  var widget = new Widget();
  widget.on('complete', function(infos) {
    info.info = infos;
    callback();
  });
  widget.on('error', function(err) {
    errors.push({ type: operation.type, id: operation.id, error: err });
    callback();
  });
  widget.info(null);
}

function operationNotSupported(errors, operation) {
  errors.push({
    type: operation.type,
    id: operation.id,
    error: util.format(
      'Operation %s not supported for %s',
      operation.operation,
      operation.type
    )
  });
}
