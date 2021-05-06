module.exports = (app, localServer) => {
  app.get('/sync-all-apis/:status', async (req, res) => {
    localServer.syncAllApiRequests = req.params.status === 'true';
    res.json({ syncingRequests: localServer.syncAllApiRequests });
  });
};
