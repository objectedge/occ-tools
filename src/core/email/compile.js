'use strict';

var async = require('async');
var winston = require('winston');
var fs = require('fs-extra');
var path = require('path');
var util = require('util');
var request = require('request');
var parser = require('xml2json');
var nodemailer = require('nodemailer');

var _config = require('../config');
var _bundle = require('./bundle');

var HTML_BODY_TEMPLATE = 'html_body.ftl';
var TEXT_BODY_TEMPLATE = 'text_body.ftl';
var SUBJECT_TEMPLATE = 'subject.ftl';

var HTML_BODY_COMPILED = 'html_body.html';
var TEXT_BODY_COMPILED = 'text_body.html';
var SUBJECT_COMPILED = 'subject.html';

var templateFiles = [
  { file: HTML_BODY_TEMPLATE, bundle: true, compiled: HTML_BODY_COMPILED },
  { file: TEXT_BODY_TEMPLATE, bundle: false, compiled: TEXT_BODY_COMPILED },
  { file: SUBJECT_TEMPLATE, bundle: false, compiled: SUBJECT_COMPILED }
];

// The macros to simulate OCC locales functions
var macros =
  '<#function getString message argts...>' +
  '   <#assign result = message>' +
  '   <#list argts as attr>' +
  '     <#assign result = result?replace("{${attr?index}}", attr)>' +
  '   </#list>' +
  '   <#return result>' +
  '</#function>' +
  '<#function getStringNotEscaped message argts...>' +
  '   <#assign result = message>' +
  '   <#list argts as attr>' +
  '     <#assign result = result?replace("{${attr?index}}", attr)?no_esc>' +
  '   </#list>' +
  '   <#return result>' +
  '</#function>';

/**
 * Read the locales files for the email selected
 */
function readLocalesFile(callback) {
  var self = this;
  winston.info('Reading locales file for language %s', self._language);
  var localePath = path.join(self._emailPath, 'locales', self._language, 'Strings.xlf');
  winston.debug('Reading file %s', localePath);
  fs.readFile(
    localePath,
    function(error, data) {
      if (error) {
        winston.debug(error);
        callback('Error reading email locale file');
      }
      var json = parser.toJson(data);
      self._locales = JSON.parse(json);
      callback();
    }
  );
}

/**
 * Read all template files
 */
function readTemplateFiles(callback) {
  var self = this;
  async.each(
    templateFiles,
    function (template, callback){
      readTemplateFile.call(self, template.file, template.bundle, callback);
    },
    callback
  );
}

/**
 * Read a template file, replace the includes, and replace the locales to the actual string
 */
function readTemplateFile(template, bundle, callback) {
  var self = this;
  winston.info('Reading template %s', template);
  var templatePath = path.join(self._emailPath, template);
  winston.debug('Reading file %s', templatePath);
  fs.readFile(
    templatePath, 'utf8',
    function(error, data) {
      if (error) {
        winston.debug(error);
        winston.warn(error.message);
      }

      if (data){
        var replaceLocales = function(data) {
          self._locales.xliff.file.body['trans-unit'].forEach(function(message) {
            data = data.replace(
              new RegExp('"' + message.id + '"|\'' + message.id + '\'', 'g'),
              util.format('"%s"', message.target || message.source)
            );
          });
          self._templates[template] = data.replace(/\\'/g, '\'') + '\n\n' + macros;
          winston.debug('Template %s: %s', template, self._templates[template]);
          callback();
        };

        if (bundle) {
          data = _bundle(data, replaceLocales);
        } else {
          replaceLocales(data);
        }
      } else {
        self._templates[template] = null;
        callback();
      }
    }
  );
}

/**
 * Read the JSON data file
 */
function readDataJson(callback) {
  var self = this;
  winston.info('Reading template JSON data file');
  winston.debug('Reading file %s', this._dataPath);
  fs.readFile(this._dataPath, 'utf8', function(error, data) {
    if (error) {
      winston.debug(error);
      callback('Error reading JSON data file file');
    }

    self._data = data;
    winston.debug('JSON data: %s', data);
    callback();
  });
}


/**
 * Compiles all templates
 */
function compileTemplates(callback) {
  var self = this;
  async.each(
    templateFiles,
    function (template, callback){
      compileTemplate.call(self, template.file, template.compiled, callback);
    },
    callback
  );
}

/**
 * Compile the template
 */
function compileTemplate(template, compiledTemplate, callback) {
  var self = this;
  winston.info('Compiling template %s', template);
  if (!self._templates[template]) {
    winston.warn('The template %s does not exist or is empty', template);
    callback();
  } else {
    var options = {
      url: self._mailCompilerServer,
      json: {
        template: self._templates[template],
        dataModel: 'data = ' + self._data,
        outputFormat: 'HTML',
        locale: 'en_US',
        timeZone: 'America/Los_Angeles',
        tagSyntax: 'angleBracket',
        interpolationSyntax: 'legacy'
      }
    };
    winston.debug('Compile email request: %s', JSON.stringify(options, null, 2));
    request.post(
      options,
      function(error, response, data) {
        if (error){
          winston.debug(error);
          callback('Error compiling the email template');
        }

        if (data.problems && data.problems.length) {
          data.problems.forEach(function(error){
            winston.error(error.message);
          });
          callback('Error compiling the email template');
        }

        self._compiled[template] = data.result;
        winston.debug('Compiled template %s: %s', template, self._compiled[template]);
        winston.info('Storing compiled template %s', compiledTemplate);
        fs.outputFile(
          path.join(self._emailPath, compiledTemplate),
          data.result,
          {},
          callback
        );
      }
    );
  }
}

/**
 * Send the email, if mailTo is configured
 */
function sendEmail(callback){
  var self = this;
  if (self._mailTo){

    if(!self._mailToOptions.from) {
      return callback('mailFrom option not specified and this is required when using mailTo.');
    }

    if(!self._mailToOptions.mailToHost) {
      return callback('mailToHost option not specified and this is required when using mailTo.');
    }

    if(!self._mailToOptions.mailToAuthUser) {
      return callback('mailToAuthUser option not specified and this is required when using mailTo.');
    }

    if(!self._mailToOptions.mailToAuthPassword) {
      return callback('mailToAuthPassword option not specified and this is required when using mailTo.');
    }

    winston.info('Sending email');

    var transporter = nodemailer.createTransport({
      port: 465,
      host: self._mailToOptions.host,
      secure: true,
      auth: {
        user: self._mailToOptions.user,
        pass: self._mailToOptions.password,
      },
      debug: true
    });

    var mailOptions = {
      from: self.mailOptions.from,
      to: self._mailTo,
      subject: self._compiled[SUBJECT_TEMPLATE],
      html: self._compiled[HTML_BODY_TEMPLATE]
    };

    if (self._compiled[TEXT_BODY_TEMPLATE]) {
      mailOptions.text = self._compiled[TEXT_BODY_TEMPLATE];
    }

    transporter.sendMail(mailOptions, function (error) {
      if(error){
        winston.debug(error);
        callback('Error sending the email');
      } else {
        winston.info('Email succesfully sent');
        callback();
      }
    });
  } else {
    callback();
  }
}

module.exports = function(emailId, settings, callback) {
  var self = this;
  self._emailId = emailId;
  self._emailFolder = path.join(_config.dir.project_root, 'emails');
  self._emailPath = path.join(self._emailFolder, self._emailId);
  self._dataPath = path.join(self._emailFolder, 'samples', settings.data);
  self._language = settings.locale || 'en';
  self._mailTo = settings.mailTo;
  self._mailToOptions = {
    from: settings.mailFrom,
    host: settings.mailToHost,
    user: settings.mailToAuthUser,
    password: settings.mailToAuthPassword
  };
  self._mailCompilerServer = settings.mailCompilerServer;
  self._templates = {};
  self._locales;
  self._data;
  self._compiled = {};

  async.waterfall(
    [
      readLocalesFile.bind(self),
      readTemplateFiles.bind(self),
      readDataJson.bind(self),
      compileTemplates.bind(self),
      sendEmail.bind(self)
    ],
    callback
  );
};
