module.exports = (app, localServer) => {
  app.get('/ccstore/v1/images*', localServer.proxyRequest.bind(localServer));
};

