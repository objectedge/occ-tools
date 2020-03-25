module.exports = (app, localServer) => {
  app.get('/file/*/widget/:version?/:widgetName/*/:file(*)', localServer.templateResponse.bind(localServer));
};
