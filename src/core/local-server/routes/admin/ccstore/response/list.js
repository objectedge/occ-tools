const { getResponses, setRange } = require('../../helpers');

module.exports = localServer => async (req, res) => {
  try {
    const response = await getResponses(localServer, req);
    setRange(req, res);
    res.json(response);
  } catch(error) {
    res.status(500);
    res.json(error);
  }
}

