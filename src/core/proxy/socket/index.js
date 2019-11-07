var io = require('socket.io');
var fs = require('fs-extra');
var path = require('path');

function SocketIO(proxy, proxyServer) {
  this.proxy = proxy;
  this.proxyServer = proxyServer;
  this.io = io(this.proxy.httpsServer._server);
  this.clients = [];
  this.events = [];
  this.prepareConnection();
}

SocketIO.prototype.prepareConnection = function () {
  var socketIOInstance = this;

  socketIOInstance.io.on('connection', function (socket) { 
    socketIOInstance.events.forEach(function (socketEvent) {
      socketEvent.callback.call(socketIOInstance, socket);
    });
  });

  // This is usually used to listen the events, but can be used to emit io events
  // when there is no socket available
  socketIOInstance.proxy.on('connect', socketIOInstance.registerEvent.bind(socketIOInstance));
};

SocketIO.prototype.registerEvent = function (callback, event) {
  var socketIOInstance = this;

  var found = socketIOInstance.events.some(function (socketIoEvent) {
    return socketIoEvent === event;
  });

  if(!found) {
    socketIOInstance.events.push({ callback: callback, event: event });
  }
};

SocketIO.prototype.addSocketIOScripts = function ($, req, resp) {
  var socketIOInstance = this;
  var client = fs.readFileSync(path.join(__dirname, 'client', 'main.js'), 'utf8');
  var widgetsLoad = fs.readFileSync(path.join(__dirname, 'client', '_widgets_loader.js'), 'utf8');

  client = client.replace(/#socketDomain/g, 'https://' + socketIOInstance.proxy.currentIP + ':8005');

  if($('#occ-proxy-socket-io').length) {
    return;
  }

  client = client.replace(/#clients/g, socketIOInstance.clients.join('\n'));

  var requireJS = $('script[src*="require.js"]');

  //We are on panel
  if(!requireJS.length) {
    requireJS = $('script').first();
  }
  
  requireJS.before('<script id="occ-temp-main-js">' + widgetsLoad + '</script>');
  requireJS.before('<script id="occ-proxy-socket-io" src="https://' + socketIOInstance.proxy.currentIP + ':8005/socket.io/socket.io.js"></script><script>' + client + '</script>');
};

SocketIO.prototype.newClient = function (event, fn, data, printHTML) {
  if(this.clients.indexOf(event) > -1) {
    return;
  }
  
  var jsTemplate = fs.readFileSync(path.join(__dirname, 'client', '_client_template.js'), 'utf8');

  jsTemplate = jsTemplate.replace(/#event/g, event);
  jsTemplate = jsTemplate.replace(/#fn/g, fn.toString());
  jsTemplate = jsTemplate.replace(/#data/g, JSON.stringify(data || { done: true }));
  this.clients.push(jsTemplate);
};

module.exports = SocketIO;
