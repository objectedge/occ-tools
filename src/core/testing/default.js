var async = require('async');
var utils = require('utils');
var config = require(casper.cli.get('widgetSettings'));
var specFiles = casper.cli.get('specFiles').split(',');
var page = config.pages.pop();

var domain = casper.cli.get('baseUrl');
var username = casper.cli.get('username');
var password = casper.cli.get('password');
var widgetName = casper.cli.get('widgetName');
var loggedIn = false;
var widgetViewModel = false;

casper.options.waitTimeout = 240000;
casper.options.viewportSize = config.viewports.pop();

casper.on('page.initialized', function (page) {
  page.onCallback = function (data) {
    widgetViewModel = data.widgetViewModel;
  };
});

casper.test.setUp(function (done) {
  if(config.pages.length) {
    page = config.pages.pop();
  }

  var pageMethod = 'start';

  if(!loggedIn) {
    casper.start(domain + '/occs-admin/');

    //Login
    casper.then(function () {
      this.waitForSelector('#cc-loginForm .form-control', function () {
        this.fillSelectors('#cc-loginForm', {
            '#cc-loginForm-CC-propertyEditor-shortText-login-field':    username,
            '#cc-loginForm-CC-propertyEditor-password-password-field':  password,
        }, null);

        this.click('#cc-login-btn');
      });
    });

    //Login success
    casper.then(function() {
        var success = function () {
          loggedIn = true;
          this.echo('Logged in');
        };

        var error = function () {
          this.die('Please try again. Timeout reached');
          this.exit();
        };

        this.waitForSelector('#cc-dashboard-welcome', success, error);
    });

  } else {
    pageMethod = 'thenOpen';
  }

  //Widget page
  casper.thenOpen(domain + '/' + page, function() {
    this.echo('entering in the page: ' + page);
  });

  casper.waitFor(function () {
    return widgetViewModel;
  }, function () {
    this.echo("WidgetModel set");
  });

  casper.run(done);
});

casper.test.tearDown(function (done) {
  casper.echo('Done');
  done();
});

casper.each(specFiles, function(self, file) {
  var spec = require(file);
});
