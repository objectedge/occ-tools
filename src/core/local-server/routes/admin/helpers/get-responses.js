const fs = require('fs-extra');
const filterResponse = require('./filter-response');
const getRequests = require('./get-requests');

module.exports = (localServer, req, id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const requests = await getRequests(localServer);
      let routes = filterResponse(req, requests);
      const responses = [];

      if(id) {
        routes = routes.filter(route => route.id === id);
      }

      for(const route of routes) {
        responses.push({ id: route.id, data: await fs.readJSON(route.responseDataPath) });
      }

      resolve(responses);
    } catch(error) {
      reject(error);
    }
  });
};
