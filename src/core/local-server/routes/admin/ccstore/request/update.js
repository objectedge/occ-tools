module.exports = localServer => async (req, res) => {
  try {
    await localServer.updateRoute(req.params.id, req.body, 'descriptor');
    res.json({ success: true });
  } catch(error) {
    res.statusCode(500);
    res.json({ success: false, error: error.message });
  }
}

