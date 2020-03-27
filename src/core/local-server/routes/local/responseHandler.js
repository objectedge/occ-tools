const winston = require('winston');
const JSON5 = require('json5')
const { find } = require('object-deep-search');
const arraySort = require('array-sort');

module.exports = (req, res, next) => {
  res.sendResponse = body => {
    if(!Array.isArray(body)) {
      res.send(body);
      return next();
    }

    if(req.query.filter) {
      try {
        const queryFilter = JSON5.parse(req.query.filter);

        if(queryFilter.q) {
          body = body.filter(item => JSON.stringify(item).search(queryFilter.q) > -1);
        } else {
          body = find(body, queryFilter);
        }
      } catch(error) {
        winston.error('Not able to parse the filter query parameter');
        winston.error(error);
      }
    }

    if(req.query.range) {
      try {
        const range = JSON5.parse(req.query.range);
        const first = range[0];
        const last = range[1];

        res.range({
          first,
          last,
          length: body.length
        });

        body = body.slice(first, last + 1);
      } catch(error) {
        winston.error('Not able to parse the range query parameter');
        winston.error(error);
      }
    }

    if(req.query.sort) {
      try {
        const querySort = JSON5.parse(req.query.sort);
        const property = querySort[0];
        const reverse = querySort[1].toLowerCase() !== 'asc';
        body = arraySort(body, property, { reverse });
      } catch(error) {
        winston.error('Not able to parse the filter query parameter');
        winston.error(error);
      }
    }

    res.send(body);
  };

  next();
};
