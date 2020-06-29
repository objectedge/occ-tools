#!/usr/bin/env node

// Replacing the the default http parse by a more flexible/tolerant HTTP parser
process.binding('http_parser').HTTPParser = require('http-parser-js').HTTPParser;

return require('./src/occ-tools');