require(['jquery'], function ($) {
  window.oe = window.oe || {
    occ: {
      version: '#OCC_VERSION'
    },
    tools: {
      version: '#OCC_TOOLS_VERSION',
      localPath: '#OCC_TOOLS_PATH',
      proxyEnv: '#OCC_TOOLS_PROXY_ENV',
      toggleWidgetState: function (widgetName) {
        if(!oe.widgets[widgetName]) {
          return false;
        }

        var widgetStatus = oe.widgets[widgetName].active;
        oe.tools.setWidgetState(widgetName, !widgetStatus);
      },
      setWidgetState: function (widgetName, active) {
        var statusString = active ? 'activated' : 'deactivated';
        occProxyIO.emit('panel-widget-update-status-client', { widgetName: widgetName, active: active }, function () {
          console.log('Widget '+ widgetName + ' has been ' + statusString + '. Please refresh the page');
        });
      },
      setAppLevelState: function (active) {
        var statusString = active ? 'activated' : 'deactivated';

        occProxyIO.emit('panel-change-config-client', { config: 'proxyAppLevel', value: true }, function () {
          console.log('App Level has been ' + statusString + '. Please refresh the page');
        });
      },
      showWidgetsOverlay: function () {
        $('html').addClass('occ-tools-proxy-overlay-on');
      },
      hideWidgetsOverlay: function () {
        $('html').removeClass('occ-tools-proxy-overlay-on');
      },
      toggleWidgetsOverlay: function () {
        $('html').toggleClass('occ-tools-proxy-overlay-on');
      },
      isWidgetActive: function (widgetName) {
        if(!oe.widgets[widgetName]) {
          return false;
        }

        return oe.widgets[widgetName].active;
      },
      toggleOverlayButton: function () {
        $('.occ-tools-proxy-toogle-overlay').toggleClass('hide');
      }
    },
    widgets: #WIDGETS
  };
});