const fs = require('fs-extra');
const filterResponse = require('./filter-response');
const getRequests = require('./get-requests');

module.exports = (localServer, req, ids) => {
  return new Promise(async (resolve, reject) => {
    try {
      const requests = await getRequests(localServer, ids);
      const responses = [];

      for(const request of requests) {
        let route = filterResponse(req, request);
        responses.push({ id: route.id, data: await fs.readJSON(route.responseDataPath) });
      }

      resolve(responses);
    } catch(error) {
      console.log(error);
      reject(error);
    }
  });
};
