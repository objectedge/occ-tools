(function () {
  var getWidgetName = function (widget) {
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
      console.error('PROXY ERROR - Cannot load widget:', widget);
      return false;
    }

    return widgetName;
  };

  var exposeWidget = function (widget) {
    Object.keys(window.oe.widgets).forEach(function (widgetName) {
      if(widget.widgetId().indexOf(widgetName) > -1) {
        window.oe.widgets[widgetName].$data = widget;
        var currentLocale = window.oe.widgets[widgetName].locales[widget.locale()];

        if(!currentLocale) {
          currentLocale = window.oe.widgets[widgetName].locales[widget.locale().replace('_', '-')];
        }

        if(currentLocale) {
          var localesJson = null;

          try {
            localesJson = JSON.parse(currentLocale);
          } catch(e) {
            console.error('Error on parsing the locales json of the widget ' + widgetName);
          }

          if(localesJson) {
            window.oe.widgets[widgetName].$data.resources(localesJson.resources);
          }
        }
      }
    });
  };

  var getTemplate = function (widget, region) {
    var widgetName = getWidgetName(widget, region);
    var template;

    if(!widgetName) {
      return;
    }

    exposeWidget(widget);
    template = this.data.templates[widgetName];

    if(template) {
      return template;
    }

    return false;
  };
  
  var getElements = function (widget, region) {
    var widgetName = getWidgetName(widget, region);
    var elements = null;

    if(!widgetName) {
      return;
    }
    
    elements = this.data.elements[widgetName];

    if(elements) {
      elements.forEach(function (elementObject, index) {
        var elementName = Object.keys(elementObject)[0];
        var elementString = elements[index][elementName];
        if($(elementString).attr('id') !== widget.widgetId() + '-' + elementName) {
          elements[index][Object.keys(elementObject)[0]] = '<script type="text/html" id="' + widget.widgetId() + '-' + elementName + '">' + elementString + '</script>';
        }
      });
    }

    return elements || [];
  };

  var checkElements = function (widget, region) {
    var widgetName = getWidgetName(widget, region);
    
    if(!widgetName) {
      return;
    }
    
    return !!this.data.elements[widgetName];
  };

  var isOracleWidget = function(widget) {
    var widgetName = getWidgetName(widget);
    
    if(!widgetName) {
      return true;
    }

    var isOracleWidget = true;

    Object.keys(oe.widgets).some(function (widgetKey) {
      if(widgetKey.indexOf(widgetName) > -1) {
        isOracleWidget = false;
        return true;
      }
    });

    return isOracleWidget;
  };

  window.proxyTemplates = {
    getWidgetName: getWidgetName,
    getTemplate: getTemplate,
    getElements: getElements,
    checkElements: checkElements,
    isOracleWidget: isOracleWidget,
    data : #data
  };
}());
