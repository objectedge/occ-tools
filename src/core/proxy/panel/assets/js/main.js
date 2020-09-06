var ioDomain = 'https://' + window.currentIP + ':8005';

requirejs.config({
  baseUrl: '/occ-proxy-panel/assets',
  packages: [
    {
      name: "codemirror",
      location: "/occ-proxy-panel/assets/js/vendors/codemirror",
      main: "codemirror"
    }
  ],
  shim : {
    'bootstrap-toggle' : {
      deps : [ 'jquery']
    },
    'bootstrap' : {
      deps : [ 'jquery']
    }
  },
  paths: {
    'text': '//cdnjs.cloudflare.com/ajax/libs/require-text/2.0.12/text.min',
    'domReady': '//cdnjs.cloudflare.com/ajax/libs/require-domReady/2.0.1/domReady.min',
    'jquery': '//cdnjs.cloudflare.com/ajax/libs/jquery/3.0.0-beta1/jquery.min',
    'bootstrap': '//cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.0.0-alpha/js/bootstrap.min',
    'bootstrap-toggle': '//cdnjs.cloudflare.com/ajax/libs/bootstrap-toggle/2.2.2/js/bootstrap2-toggle.min',
    'knockout': '//cdnjs.cloudflare.com/ajax/libs/knockout/3.4.0/knockout-min',
    'json-editor': '//cdnjs.cloudflare.com/ajax/libs/jsoneditor/5.16.0/jsoneditor.min',
    'md5': '//cdnjs.cloudflare.com/ajax/libs/blueimp-md5/2.10.0/js/md5.min',
    'view-model': 'js/viewModels/panel',
    'io': ioDomain + '/socket.io/socket.io'
  }
});

define(['domReady', 'knockout', 'view-model', 'io'], function(domReady, ko, viewModel, io) {
  window.occProxyIO = io(ioDomain);

  domReady(function () {
    occProxyIO.emit('panel-get-proxy-data', function (data) {
      ko.components.register('occ-proxy-panel', {
          viewModel: viewModel.bind(null,
            data.widgets,
            data.cacheList,
            data.mocksList,
            data.proxyOptions,
            data.mocksDir
          ),
          template: { require: 'text!templates/panel.html' }
      });

      ko.applyBindings();
    });
  });
});
