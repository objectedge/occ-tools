const { getResponses, setRange } = require('../../helpers');

module.exports = localServer => async (req, res) => {
  try {
    const response = await getResponses(localServer, req, { ids: [ req.params.id ] });
    setRange(req, res);
    res.json(response[0]);
  } catch(error) {
    res.status(500);
    res.json(error);
  }
}

