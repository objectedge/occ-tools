
window.occTempWidgetsReload = function (doneCallback) {
  require(['shared/store-libs'], function() {
    require(
      ['jquery',
       'ccConstants',
       'spinner',
       'pubsub',
       'profiletools',
       'knockout',
       'koValidate',
       'ccKoValidateRules',
       paths.layoutContainer,
       'pageLayout/rest-adapter',
       'pageLayout/api-builder',
       'routing',
       'CCi18n',
       'ccLogger',
       'ccDate',
       'ccEETagProcessor',
       'ccRestClient',
       'ccOAuthTimeout',
       'viewportHelper',
       'shared/store-loader',
       'ccResourceLoader!COMBINED_WIDGET_JS'],

      function ($, CCConstants, Spinner, PubSub, ProfileTools, ko, koValidate,
                 rules, LayoutContainer, MyRestAdapter, APIBuilder, Routing, CCi18n, log,
                 ccDate, ccEETagProcessor, ccRestClient, CCOAuthTimeout, viewportHelper) {
        "use strict";

        var adapter = new MyRestAdapter('/ccstore/v1/'),
            basePath = "/",
            layoutContainer = new LayoutContainer(adapter, basePath),
            masterViewModel = new layoutContainer.LayoutViewModel();

        $.Topic(PubSub.topicNames.PAGE_LAYOUT_LOADED).subscribe(function (args, eventData) {
          var regions = args.regions();

          doneCallback(args, function (widget) {            
            args.regions.valueHasMutated();

            //JS Reload
            // if(widget) {
            //   if (typeof widget === 'function') {
            //     widget();
            //   } else if (widget.hasOwnProperty('onLoad')
            //     && typeof widget.onLoad === 'function') {
            //     widget.onLoad(widget);
            //   }
              
            //   if (widget.hasBeforeAppear()) {
            //     $.Topic(PubSub.topicNames.PAGE_READY).subscribe(widget.maybeFireBeforeAppear.bind(widget));
            //   }
            // }
          });
        });
      } // require/function
    ); // require
  });
};
