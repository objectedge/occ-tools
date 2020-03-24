module.exports = (app, localServer) => {
  app.get('/proxy-all-apis/:status', async (req, res) => {
    localServer.proxyAllApis = req.params.status === 'true';
    res.json({ proxyAllApis: localServer.proxyAllApis });
  });
};
