module.exports = (app, localServer) => {
  app.get('/occ-server-details', (req, res) => {
    res.json(localServer.endpointsMapping);
  });
};
