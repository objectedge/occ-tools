const fs = require('fs-extra');
const { getRequests } = require('../../helpers');

module.exports = localServer => async (req, res) => {
  try {
    const request = await getRequests(localServer, { id: req.params.id });
    await fs.writeJSON(request.responseDataPath, req.body, { spaces: 2});
    res.json({ success: true });
  } catch(error) {
    res.status(500);
    res.json({ success: false, error });
  }
}

