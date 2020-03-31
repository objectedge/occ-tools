const winston = require('winston');
const JSON5 = require('json5')
const { find } = require('object-deep-search');
const arraySort = require('array-sort');

module.exports = (req, body) => {
  if(!Array.isArray(body)) {
    return body;
  }

  const query = req.query;

  if(query.filter) {
    try {
      const queryFilter = JSON5.parse(query.filter);

      if(queryFilter.q) {
        body = body.filter(item => JSON.stringify(item).search(queryFilter.q) > -1);
      } else if(queryFilter.id && Array.isArray(queryFilter.id)) {
        body = body.filter(item => queryFilter.id.includes(item.id));
      } else {
        body = find(body, queryFilter);
      }
    } catch(error) {
      winston.error('Not able to parse the filter query parameter');
      winston.error(error);
    }
  }

  if(query.range) {
    try {
      const range = JSON5.parse(query.range);
      const first = range[0];
      const last = range[1];

      req.range.first = first;
      req.range.last = last;
      req.range.length = body.length;

      body = body.slice(first, last + 1);
    } catch(error) {
      winston.error('Not able to parse the range query parameter');
      winston.error(error);
    }
  }

  if(query.sort) {
    try {
      const querySort = JSON5.parse(query.sort);
      const property = querySort[0];
      const reverse = querySort[1].toLowerCase() !== 'asc';
      body = arraySort(body, property, { reverse });
    } catch(error) {
      winston.error('Not able to parse the filter query parameter');
      winston.error(error);
    }
  }

  return body;
};
