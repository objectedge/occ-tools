module.exports = (app, localServer) => {
  app.get('/file/*/global/:file(*.js)', localServer.transpiledJsResponse.bind(localServer, 'app-level'));
};

