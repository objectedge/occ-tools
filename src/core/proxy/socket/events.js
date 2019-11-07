var winston = require('winston');

module.exports = [
  {
    name: 'js-changed',
    fn: function (data, $) {

      if(!data.widget.active) {
        return;
      }

      window.location.reload();

      // occTempWidgetsReload(function (args, done) {
      //   var regions = args.regions();

      //   regions.forEach(function(region) {
      //     region.widgets().forEach(function(widget) {
      //      if(widget.javascript() === data.widgetName) {
      //        var widgetPath = widget.assetMappings["/js/" + widget.javascript() + '.js']();
      //        var path = widget.assetMappings["/js/" + data.file]();

      //        var pathsVariations = ['./', '/', '/' + data.widgetName + '/', 'js/', './js/', '/js/'];

      //        pathsVariations.forEach(function (basePath) {
      //         require.undef(basePath + data.file);
      //        });

      //        require.undef(widgetPath);
      //        require([widgetPath], function (model) {
      //           var widgetKey;

      //           for(widgetKey in widget) {
      //             if(model.hasOwnProperty(widgetKey)) {
      //               widget[widgetKey] = model[widgetKey];
      //             }
      //           }

      //           done(widget);
      //        });
      //      }
      //     });
      //   });
      // });
    }
  },
  {
    name: 'less-changed',
    fn: function (data, $) {
      if(!data.widget.active) {
        return;
      }

      var style = $('link[href*="widgets.css"]');
      var styleClone = style.first().clone();
      
      var styleInterval = setInterval(function() {
        try {
          styleClone[0].sheet.cssRules;
          var allCSSs = $('link[href*="widgets.css"]');
          var totalCSSs = allCSSs.length;

          allCSSs.each(function (index, element) {
            if(index !== totalCSSs - 1) {
              $(element).remove();
            }
          });

          clearInterval(styleInterval);
        } catch (e){}
      }, 10);

      var styleHref = styleClone.attr('href').replace(/\?new.*/, '');

      styleClone.attr('href', styleHref + '?new=' + new Date().getTime());
      style.after(styleClone);
    }
  },
  {
    name: 'theme-changed',
    fn: function (data, $) {
      $('link[href$="theme.css"]').addClass('occ-main-storefront-css');
      if(!$('.less-changes-loader').length) {
        $('body').append('<div class="less-changes-loader" style="position: fixed; top: 0; bottom: 0; left: 0; right: 0; background: #000; opacity: 0.5;">Loading changes...</div>"');
      }
      
      var style = $('.occ-main-storefront-css');
      var styleClone = style.clone();

      var styleInterval = setInterval(function() {
        try {
          styleClone[0].sheet.cssRules;
          var allCSSs = $('link[href*="theme.css"]');
          var totalCSSs = allCSSs.length;

          allCSSs.each(function (index, element) {
            if(index !== totalCSSs - 1) {
              $(element).remove();
            }
          });
          setTimeout(function () {
            $('.less-changes-loader').remove();
          }, 1000);
          clearInterval(styleInterval);
        } catch (e){}
      }, 10);

      var styleHref = styleClone.attr('href').replace(/\?new.*/, '');

      styleClone.attr('href', styleHref + '?new=' + new Date().getTime());
      style.after(styleClone);

      window.occProxyIO.emit("run-hologram-client", {
        path: window.location.pathname
      }, function (compiledHtml) {
        if(!compiledHtml) {
          return;
        }

        compiledHtml = compiledHtml.replace(/href="\/?/g, 'href="/occ-styleguide/');

        var newHtml = $($.parseHTML(compiledHtml));
        var header = newHtml.find('header:eq(0)');
        var content = newHtml.find('section.row:eq(0)');

        $('body > .container > header').html(header.html());
        $('body > .container > section').html(content.html());

        winston.info('Hologram compiled');
      });
    }
  },
  {
    name: 'template-changed',
    fn: function (data, $) {

      if(!data.widget.active) {
        return;
      }

      window.occTempWidgetsReload(function (args, done) {
        var regions = args.regions();

        regions.forEach(function(region) {
          region.widgets().forEach(function(widget) {
            var widgetId = widget.widgetId();

            if(widgetId) {
              widgetId = widgetId.replace(/(.*)?_v[0-9]+$/, '$1');
            }

            var widgetName = widget.assetMappings['/widget.json'];

            if(widgetName) {
              widgetName = widgetName().split('/');
              widgetName = widgetName[widgetName.length - 2];
            } else {
              if(widget.assetMappings['/less/widget.less']) {
                widgetName = widget.assetMappings['/less/widget.less']().split('/');
                widgetName = widgetName[widgetName.length - 3];
              } else if(widgetId) {
                widgetName = widgetId;
              }
            }

            if(!widgetName) {
              winston.error('PROXY ERROR - Cannot load widget:', widget);
              return false;
            }

          if(data.widgetName === widgetName) {
            window.proxyTemplates.data.templates[widgetName] = data.templateSrc;

            widget.templateSrc(data.templateSrc);
            widget.templateUrl('occ-proxy-template-' + new Date().getUTCMilliseconds());

            done(widget);
          }
          });
        });
      });
    }
  }
];
