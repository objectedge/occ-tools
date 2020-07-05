module.exports = (app, localServer) => {
  app.use('/proxy/:path(*)', (req, res) => {
    localServer.proxyRequest(req, res, req.params.path);
  });
};
