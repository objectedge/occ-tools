module.exports = localServer => async (req, res) => {
  try {
    await localServer.deleteRoutes(req.params.id.split(','));
    res.json({ success: true });
  } catch(error) {
    res.status(500);
    res.json({ success: false, error: error.message });
  }
}
