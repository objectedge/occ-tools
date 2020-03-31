const { filterResponse, setRange, getRequests } = require('../../helpers');

module.exports = localServer => async (req, res) => {
  try {
    const requests = await getRequests(localServer, { id: req.params.id });
    const response = filterResponse(req, requests);
    setRange(req, res);
    res.json(response);
  } catch(error) {
    res.status(500);
    res.json(error);
  }
}

