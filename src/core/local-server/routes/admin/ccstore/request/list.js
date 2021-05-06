const { filterResponse, setRange, getRequests } = require('../../helpers');

module.exports = localServer => async (req, res) => {
  try {
    const requests = await getRequests(localServer);
    const response = filterResponse(req, requests);
    setRange(req, res);
    res.json(response);
  } catch(error) {
    console.log(error);
    res.status(500);
    res.json(error);
  }
}

