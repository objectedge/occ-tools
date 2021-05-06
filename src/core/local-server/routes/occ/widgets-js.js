module.exports = (app, localServer) => {
  app.get('/file/*/widget/:file(*.js)', localServer.transpiledJsResponse.bind(localServer, 'widgets'));
};
