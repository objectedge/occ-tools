module.exports = localServer => async (req, res) => {
  try {
    await localServer.updateRoute(req.params.id, req.body, 'response');
    res.json({ success: true });
  } catch(error) {
    res.status(500);
    res.json({ success: false, error: error.message });
  }
}

