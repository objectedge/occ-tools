'use strict';

var path = require('path');
var fs = require('fs-extra');
var winston = require('winston');
var github = require('../github');
var _config = require('../config');

var paymentTypes = {
  'card': {
    'transactionTypes': ['authorization', 'void', 'refund']
  },
  'cash': {
    'transactionTypes': ['initiate', 'cancel']
  },
  'generic':{
    'transactionTypes': ['initiate', 'retrieve', 'authorization', 'void', 'refund']
  },
  'physicalGiftCard':{
    'transactionTypes': ['balanceInquiry', 'authorize', 'void', 'refund'],
    'processor' : 'genericGiftCard' 
  },
  'invoice': {
    'transactionTypes': ['authorization']
  },
  'loyaltyPoints': {
    'transactionTypes': ['balanceInquiry', 'authorize', 'void', 'refund'],
    'processor' : 'loyaltyPoints'
  }
};

var optionsTemplate = '         {\n           "id": "__TYPE__",\n           "value": "__TYPE__",\n           "labelResourceId": "__TYPE__Label"\n         }';

function getPaymentGatewayFilePath(name, types, metadata, remoteRootFolder) {
  
  var localRootFolder = path.join('settings', 'gateway', name);
  var replacedRemoteFilePath = metadata.path.replace(/template/g, name);

  var remoteFolder = path.relative(remoteRootFolder, replacedRemoteFilePath);

  return path.join(_config.dir.project_root, localRootFolder, remoteFolder);
}

function replace(needle, replace, haystack){
  var regex = new RegExp(needle, 'g');
  return haystack.replace(regex, replace); 
}

function buildOptions(types){
  var options = types.map(function(type){
    return replace('__TYPE__', type, optionsTemplate);
  }).join(',\n');

  return '[\n'+ options +'\n      ]';
}

function buildTransactionTypes(types){
  return types.map(function(type){
    return '    "'+ type +'": ' + JSON.stringify(paymentTypes[type].transactionTypes);
  }).join(',\n');
}

function buildProcessors(types){  
  var processors = types.filter(function(type){
    return paymentTypes[type].hasOwnProperty('processor');
  }).map(function(type){
    return '    "'+ type +'": "'+ paymentTypes[type].processor+'"'
  }).join(',\n');

  return processors ? ',\n  "processors": {\n'+processors+'\n  }' : '';
}

function generatePaymentGatewayFromDefault(name, types, callback) {
  var remoteSettingsPath = 'samples/gateway/template';      
  github.list({
    repo: 'occ-components',
    remotePath: remoteSettingsPath,
    each: function (error, metadata, callback) {
      if(error)  {
        callback(error, null);
        return;
      }

      var filePath = getPaymentGatewayFilePath(name, types, metadata, remoteSettingsPath);

      var content = new Buffer(metadata.content, 'base64').toString();
      content =  replace('__TITLE__', name, content);
      if (metadata.name === 'gateway.json'){
        content = replace('__TYPES__', JSON.stringify(types), content);
        content = replace('__TRANSACTION_TYPES__', buildTransactionTypes(types), content);
        content = replace('__PROCESSORS__', buildProcessors(types), content)
      } else if (metadata.name === 'config.json'){
        content = replace('__DEFAULT_VALUE__', '"'+ types[0] +'"', content);
        content = replace('__OPTIONS__', buildOptions(types), content);
      } 

      winston.debug('Creating file "%s"...', metadata.name);
      fs.outputFile(filePath, content, callback);
    }
  }, callback);
}

function validateTypes(types, callback){
  var possibleTypes = Object.keys(paymentTypes);
  types.forEach(function(type){
    if (!possibleTypes.includes(type)){
      callback('No payment type found for ' + type);
    }
  })
}

module.exports = function (name, options, callback) {
  winston.info('Generating payment gateway settings "%s"...', name);
  var types = options.types;

  validateTypes(types, callback);

  generatePaymentGatewayFromDefault(name, types, callback);
};
