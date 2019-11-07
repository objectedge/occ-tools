define(
  [
    'jquery', 'knockout', 'bootstrap', 'bootstrap-toggle', 'json-editor', 'md5',
    'codemirror','codemirror/codemirror-css', 'codemirror/codemirror-javascript', 'codemirror/codemirror-xml'
  ],

  function ($, ko, bootstrap, bootstrapToggle, JSONEditor, md5, CodeMirror) {
    function panelViewModel(widgets, cacheList, mocksList, proxyOptions, mocksDir) {
      var currentViewModel = this;
    
      function init() {
        setContentEdition();
        setWidgets();
        setCache();
        setMocks();
        setUploadWidget();
        setFilters();
        setTabs();
        setConfigs();
      }
    
      currentViewModel.showSavedMessage = ko.observable(false);
      currentViewModel.showErrorMessage = ko.observable(false);
      currentViewModel.errorMessage = ko.observable();
      
      function showErrorModal(message) {
        currentViewModel.errorMessage(message);
        $('#error-message-box').on('closed.bs.alert', function () {
          currentViewModel.errorMessage(null);
        });
      }

      function showMessageControl(type, status, delay) {
        var functionName = type === 'error' ? 'showErrorMessage' : 'showSavedMessage';
        var process = function () {
          if(status === 'show') {
            currentViewModel[functionName](true);
            setTimeout(function () {
              currentViewModel[functionName](false);
            }, 1000);
          } else {
            currentViewModel[functionName](false);
          }
        };
    
        if(delay) {
          setTimeout(process, delay);
        } else {
          process();
        }
      }
    
      function setContentEdition() {
        currentViewModel.renderJSONEditor = ko.observable();
        currentViewModel.contentViewer = ko.observable();
    
    
        function updateFileContent(route, data, content, done) {
          occProxyIO.emit(route, data, content, function (error, status) {
            if(!error) {
              showMessageControl('error', 'hide');
              showMessageControl('success', 'show', 300);
            } else {
              showMessageControl('error', 'show', 300);
              showMessageControl('success', 'hide');
              console.error(status);
            }
          });
        }
    
        currentViewModel.saveContent = function (data, content, type) {
          var routes = {
            'mock': 'panel-mock-update-content',
            'cache': 'panel-cache-update-content'
          };
      
          updateFileContent(routes[type], data, content);
        };
      
        currentViewModel.openFileContentHandler = function (itemData) {
          currentViewModel.renderJSONEditor(true);
          currentViewModel.renderJSONEditor(false);
          currentViewModel.renderJSONEditor(true);
      
          occProxyIO.emit("panel-get-cache-content", itemData.key, function (error, content) {
            var container = $("#json-editor");
            var jsonEditorInstance;
      
            if(error) {
              container.html('<p>Error on trying to get the cache. See console logs.</p>');
              console.error(content);
              return;
            }
      
            try {  
              var options = {
                modes: ['tree', 'code'],
                onChange: function () { 
                  currentViewModel.saveContent(itemData.key, jsonEditorInstance.get(), 'cache');
                }
              };
              jsonEditorInstance = new JSONEditor(container.get(0), options);
              jsonEditorInstance.set(JSON.parse(content));
              $('#editJson').modal();
            } catch(e) {
              currentViewModel.showContent(content, itemData.key, 'cache');
              currentViewModel.renderJSONEditor(false);
            }
          });   
        };
      
        currentViewModel.showContent = function (content, data, type) {
          var contentViewer = $('#content-viewer');
          currentViewModel.contentViewer(false);
          currentViewModel.contentViewer(content);
          contentViewer.modal();
      
          var editorConfigs = {
            lineNumbers: true,
            styleActiveLine: true,
            matchBrackets: true,
            tabSize: 2,
            indentWithTabs: false,
            theme: 'monokai',
            mode: 'xml'
          };
      
          if(/css/.test(data)) {
            editorConfigs.mode = 'css';
          } else if(/js/.test(data)) {
            editorConfigs.mode = 'javascript';
          }
                    
          setTimeout(function () {
            var editor = CodeMirror.fromTextArea(document.getElementById('content-viewer-text-area'), editorConfigs);
            editor.on('changes', function (editor) {
              currentViewModel.saveContent(data, editor.getValue(), type);
            });
          }, 300);
        };
      }
    
      function setWidgets() {
        currentViewModel.widgets = ko.utils.arrayMap(widgets, function(widget) {
                                      return ko.observable(widget);
                                    });
    
        currentViewModel.widgetStatus = ko.observableArray();
        
        // Generate Extension
        currentViewModel.extensionId = ko.observable();
        
        var extensionData = null;
        currentViewModel.generateExtensionClick = function () {
          extensionData = this;
          occProxyIO.emit("panel-get-extension-information", extensionData.extensionName, (error, data) => {
            if(error) {
              return;
            }

            if(!data) {
              currentViewModel.extensionId('noIDFound');
              return;
            }

            currentViewModel.extensionId(data.id);
          });

          $('#generate-widget-modal').one('hidden.bs.modal', function () {
            currentViewModel.widgetStatus.removeAll();
            extensionData = null;
            currentViewModel.extensionId(null);
          });
        };

        currentViewModel.generateExtension = function () {
          extensionData.extensionId = currentViewModel.extensionId();

          occProxyIO.emit("panel-generate-extension-client", extensionData, function () {
            currentViewModel.widgetStatus.push({
              statusData: 'Done',
              error: null
            });
          });
        };

        occProxyIO.on("panel-generate-extension-status", function (data, error) {
          console.log('generating widget widget..');

          currentViewModel.widgetStatus.push({
            statusData: data,
            error: error
          });
        });

        var changeWidgetStatus = function () {
          var checkbox = $(this);
          var isActive = checkbox.prop('checked');
    
          var widgetObject = {
            widgetName: checkbox.data('widget-name'),
            active: isActive
          };
    
          occProxyIO.emit("panel-widget-update-status-client", widgetObject, function (status) {
            console.log(status);
          });
        };
    
        var setWidgetToggle = function (widget) {
          var checkboxElement = $('#checkbox-status-' + widget.widgetName);
          var checkboxStatus = widget.active ? 'on' : 'off';
    
          if(!checkboxElement.data('bs.toggle')) {
            checkboxElement.bootstrapToggle(checkboxStatus).change(changeWidgetStatus);
          } else {
            checkboxElement.bootstrapToggle(checkboxStatus);
          }
        };
    
        var checkWidget = function (changedWidget) {
          currentViewModel.widgets.some(function (widgetKO, index) {
            var widget = widgetKO();
    
            if(widget.widgetName === changedWidget.widgetName) {
              currentViewModel.widgets[index](changedWidget);
              return true;
            }
          });
        };
    
        occProxyIO.emit("panel-widget-updated-check-client", null, function (widgetList) {
          widgetList.forEach(checkWidget);
        });
    
        currentViewModel.onWidgetsLoaded = function (elements, widgetsKO) {
          setWidgetToggle(widgetsKO());
        };
    
        occProxyIO.on("panel-widget-updated", checkWidget);
      }
    
      function setMocks() {
        currentViewModel.mocksDir = mocksDir;
        currentViewModel.mockData = ko.observable();
        currentViewModel.mocksList = ko.observableArray(ko.utils.arrayMap(mocksList, function(mock) {
                                        mock.filePath = mock.filePath || '';
                                        return ko.observable(mock);
                                    }));
        
        var changeMockStatus = function (mock) {
          var checkbox = $(this);
          mock.enabled = checkbox.prop('checked');
          mock.update = true;
                    
          occProxyIO.emit("panel-save-mock", mock, function (error, status) {
            if(error) {
              return console.error(status);
            }
    
            console.log('Updated', status);
          });
        };
    
        currentViewModel.onMocksListRendered = function (elements, mockKO) {
          var mock = mockKO();
          var row = $(elements[1]);
    
          var checkboxElement = row.find('input[name="checkbox-mock-status"]');
          var checkboxStatus = mock.enabled ? 'on' : 'off';
          
          if(!checkboxElement.data('bs.toggle')) {
            checkboxElement.bootstrapToggle(checkboxStatus).change(function () {
              changeMockStatus.call(this, mock);
            });
          } else {
            checkboxElement.bootstrapToggle(checkboxStatus);
          }
        };
    
        currentViewModel.wipeMock = function (data) {
          occProxyIO.emit("panel-mock-wipe-client", data, function (error, message) {
            var currentMocksList = currentViewModel.mocksList();
            
            if(error) {
              showErrorModal(message);
              return;
            }
            
            if(data.url) {
              currentMocksList.some(function (mock) {
                if(mock().url === data.url) {
                  currentViewModel.mocksList.remove(mock);
                  return true;
                }
              });
              return;
            }
    
            currentViewModel.mocksList.removeAll();
          });
        };
    
        currentViewModel.openMockContentHandler = function (itemData) {
          currentViewModel.renderJSONEditor(true);
          currentViewModel.renderJSONEditor(false);
          currentViewModel.renderJSONEditor(true);
      
          occProxyIO.emit("panel-get-mock-content", itemData, function (error, content) {
            var container = $("#json-editor");
            var jsonEditorInstance;
      
            if(error) {
              container.html('<p>Error on trying to get the mock. See console logs.</p>');
              console.error(content);
              return;
            }
      
            try {  
              var options = {
                modes: ['tree', 'code'],
                onChange: function () { 
                  currentViewModel.saveContent(itemData, jsonEditorInstance.get(), 'mock');
                }
              };
              jsonEditorInstance = new JSONEditor(container.get(0), options);
              jsonEditorInstance.set(JSON.parse(content));
              $('#editJson').modal();
            } catch(e) {
              currentViewModel.showContent(content, itemData, 'mock');
              currentViewModel.renderJSONEditor(false);
            }
          }); 
        };
    
        currentViewModel.openSaveAsMockModal = function (data) {
          var saveAsMockModal = $('#save-as-mock-modal');
          var defaultFileName = data.dataFile.split('/').pop().replace('.dat', '');
          data.mockFilePath = ko.observable(mocksDir);
          data.url = ko.observable(data.key);
          data.fileName = ko.observable(defaultFileName);
          data.url.subscribe(function () {
            var url = data.url();
      
            if(url !== data.key) {
              data.fileName(md5(url));
            }
          });
    
          currentViewModel.mockData(data);
          saveAsMockModal.modal();
        };
      
        currentViewModel.saveAsMock = function (data) {
          data.key = data.url();
          data.mockFilePath = data.mockFilePath() + '/' + data.fileName() + '.dat';
          delete data.url;
          delete data.fileName;
          occProxyIO.emit("panel-save-mock", data, function (error, status) {
            if(!error) {
              showMessageControl('error', 'hide');
              showMessageControl('success', 'show', 300);
              setTimeout(function () {
                $('#save-as-mock-modal').modal('hide');
                currentViewModel.mockData(null);
              }, 800);
            } else {
              showMessageControl('error', 'show', 300);
              showMessageControl('success', 'hide');
              console.error(status);
            }
          });
        };
      }
    
      function setCache() {
        currentViewModel.cacheList = ko.observableArray(
                                      ko.utils.arrayMap(cacheList, function(cache) {
                                        return ko.observable(cache);
                                      }));
        
        currentViewModel.wipeCache = function (id) {
          occProxyIO.emit("panel-cache-wipe-client", id, function () {
            var cacheList = currentViewModel.cacheList();
    
            if(id) {
              cacheList.some(function (cache, index) {
                if(cache().key === id) {
                  currentViewModel.cacheList.remove(cache);
                  return true;
                }
              });
              return;
            }
    
            currentViewModel.cacheList.removeAll();
          });
        };
    
        var changeCacheStatus = function () {
          var checkbox = $(this);
          var isActive = !checkbox.prop('checked');
    
          if(isActive) {
            occProxyIO.emit("panel-cache-pause-client", checkbox.data('cache-key'), function (status) {
              console.log(status);
            });
          } else {
            occProxyIO.emit("panel-cache-resume-client", checkbox.data('cache-key'), function (status) {
              console.log(status);
            });
          }
        };
    
        currentViewModel.onCacheListRendered = function (elements, cacheKO) {
          cache = cacheKO();
          var row = $(elements[1]);
    
          var checkboxElement = row.find('input[name="checkbox-dont-cache"]');
          var checkboxStatus = cache.active ? 'on' : 'off';
    
          if(!checkboxElement.data('bs.toggle')) {
            checkboxElement.bootstrapToggle(checkboxStatus).change(changeCacheStatus);
          } else {
            checkboxElement.bootstrapToggle(checkboxStatus);
          }
        };
      }
    
      function setUploadWidget() {
        currentViewModel.uploadWidget = function (widget) {
          occProxyIO.emit("panel-upload-widget-client", widget, function () {
            console.log('widget upload complete!');
    
            $('#consoleModal').one('hidden.bs.modal', function (e) {
              currentViewModel.widgetStatus.removeAll();
            });
          });
        };
    
        occProxyIO.on("panel-upload-widget-status", function (data, error) {
          console.log('uploading widget..');
          currentViewModel.widgetStatus.push({
            statusData: data,
            error: error
          });
        });
      }
    
      function setFilters() {
        var filterContainer = $('.filter-search-container');
        var filterContent = function (value, element) {
          var searchableContent = element.find('.searchable');
          var rex = new RegExp(value, 'i');
    
          searchableContent.hide().filter(function () {
              return rex.test($(this).find('.search-item').text());
          }).show();
        };
    
        filterContainer.each(function (index, element) {
          element = $(element);
          var field = element.find('.filter-search-field');
    
          field.keyup(function () {
            filterContent(this.value, element);
          });
        });
    
        currentViewModel.filterContent = function (term, data, event) {
          var option = $(event.currentTarget);
          var element = option.closest('.filter-search-container');
          filterContent(term, element);
        };
      };
    
      function setTabs() {
        var occTabs = $('.occ-tab-item');
    
        var prevItem = occTabs.first();
        occTabs.on('click', function (event) {
          event.preventDefault();
          var item;
          var content;
    
          prevItem.parent().removeClass('active');
          content = $(prevItem.attr('href'));
          content.removeClass('active');
    
          item = $(this);
          content = $(item.attr('href'));
    
          item.parent().addClass('active');
          content.addClass('active');
    
          prevItem = item;
        });
      }
    
      function setConfigs() {
        currentViewModel.proxyOptions = {
          currentEnv: {
            label: 'Current environment',
            value: ko.observable(proxyOptions.environment.current),
            type: 'string'
          },
          useCache: {
            label: 'Use the cache system',
            value: ko.observable(proxyOptions.cache.enabled),
            type: 'checkbox'
          },
          useAutoJSReload: {
            label: 'Use auto JS reload',
            value: ko.observable(proxyOptions.reload.js),
            type: 'checkbox'
          },
          useAutoLessReload: {
            label: 'Use auto Less reload',
            value: ko.observable(proxyOptions.reload.less),
            type: 'checkbox'
          },
          useAutoTemplateReload: {
            label: 'Use auto Template reload',
            value: ko.observable(proxyOptions.reload.template),
            type: 'checkbox'
          },
          useAutoThemeReload: {
            label: 'Use auto Theme reload',
            value: ko.observable(proxyOptions.reload.theme),
            type: 'checkbox'
          },
          hidePreviewBar: {
            label: 'Hide Preview Bar',
            value: ko.observable(proxyOptions.hidePreviewBar),
            type: 'checkbox'
          },
          proxyAppLevel: {
            label: 'Activate proxy on app-level applications',
            value: ko.observable(proxyOptions.proxyAppLevel),
            type: 'checkbox'
          }
        };
    
        var changeConfigStatus = function () {
          var checkbox = $(this);
          var configKey = checkbox.data('config-key');
          var state = checkbox.prop('checked');
    
          occProxyIO.emit("panel-change-config-client", { config: configKey, value: state }, function (status) {
            console.log('config ' + configKey + ' change status: ' + status);
          });
        };
    
        currentViewModel.onConfigsRendered = function (elements, configKey) {
          var currentConfig = currentViewModel.proxyOptions[configKey];
          elements = elements.filter(function (item) {
            return item.nodeType === 1;
          });
    
          var element = $(elements[0]);
    
          if(currentConfig.type === 'checkbox') {
            var checkboxElement = element.find('input[type="checkbox"]');
            var checkboxStatus = currentConfig.value() ? 'on' : 'off';
    
            if(!checkboxElement.data('bs.toggle')) {
              checkboxElement.bootstrapToggle(checkboxStatus).change(changeConfigStatus);
            } else {
              checkboxElement.bootstrapToggle(checkboxStatus);
            }
          }
        };
      }
    
      init();
    }

  return panelViewModel;
});
