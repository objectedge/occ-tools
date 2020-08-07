'use strict';

var winston = require('winston');
var async = require('async');
var path = require('path');
var _config = require('../config');
var fs = require('fs-extra');
var util = require('util');

/**
 * Get the widget.json configuration
 *
 * @param {String} widgetType The widget type
 * @param {Object} backup The backup information
 * @param {Object} occ The OCC requester
 * @param {Function} callback The callback function
 */
var getWidgetConfig = function (widgetType, backup, occ, callback) {
  fs.readFile(
    path.join(_config.dir.project_root, 'widgets', 'objectedge', widgetType, 'widget.json'),
    'utf8',
    function (error, data) {
      if (error) callback(error);
      return callback(null, JSON.parse(data));
    }
  );
};

/**
 * Creates the new widget instances with the same name
 *
 * @param {String} widgetType The widget type
 * @param {Object} backup The backup information
 * @param {Object} occ The OCC requester
 * @param {Object} config The widget.json
 * @param {Function} callback The callback function
 */
var createInstances = function (widgetType, backup, occ, config, callback) {
  if (!config.global && backup.widget && backup.widget.instances && backup.widget.instances.length) {
    winston.info('Creating new widget instances');
    var newInstances = {};
    async.forEach(backup.widget.instances, function (instance, cb) {
      // creates the new instances
      var request = {
        'api': '/widgets',
        'method': 'post',
        'body': {
          'widgetDescriptorId': widgetType,
          'displayName': instance.displayName
        },
        'headers': {
          'x-ccasset-language': 'en'
        }
      };
      occ.request(request, function (error, response) {
        if (error || response.errorCode) cb(error || response.message);
        winston.info('New instance created %s', response.repositoryId);
        // store the new instances indexed by the previous instance ID
        newInstances[instance.id] = response.repositoryId;
        cb();
      });
    }, function (error) {
      if (error) callback(error);
      callback(null, config, newInstances);
    });
  } else {
    callback(null, config, null);
  }
};

/**
 * Replace the old widget IDs by the newly generated ones.
 *
 * @param {Object} structure The widget type
 * @param {object} instances The new widget instances
 * @param {object} backup The backup information
 */
var replaceWidgetInstaces = function(structure, instances, backup){
  if (structure.regions){
    structure.regions.forEach(function (region) {
      if (region.regions) {
        replaceWidgetInstaces(region, instances, backup);
      }
      region.widgets.forEach(function (widget) {
        if (backup.widgetIds.includes(widget.repositoryId)) {
          widget.repositoryId = instances[widget.repositoryId];
        }
      });
    });
  }
};

/**
 * Places the newly created instances on the layout they were before.
 *
 * @param {String} widgetType The widget type
 * @param {Object} backup The backup information
 * @param {Object} occ The OCC requester
 * @param {Object} config The widget.json
 * @param {Array} instances The new widget instances
 * @param {Function} callback The callback function
 */
var placeInstances = function (widgetType, backup, occ, config, instances, callback) {
  if (!config.global && instances && backup.structures && Object.keys(backup.structures).length) {
    winston.info('Restoring widget positions on pages');
    var structureIds = Object.keys(backup.structures);
    async.forEach(structureIds, function (structureId, cb) {
      var structure = backup.structures[structureId];

      // replace the old widget IDs by the newly generated ones
      replaceWidgetInstaces(structure, instances, backup);

      // updates the page layout with the new instances
      var request = {
        'api': util.format('/layouts/%s/structure', structureId),
        'method': 'put',
        'body': {
          'layout': structure
        },
        'headers': {
          'x-ccasset-language': 'en'
        }
      };
      occ.request(request, function (error, response) {
        if (error || response.errorCode) {
          // Dont block the entire process because of one error.
          winston.error(response);
          cb();
        } else {
          winston.info('Widgets were placed on %s layout', structureId);
          cb();
        }
      });
    }, function (error) {
      if (error) callback(error);
      callback(null, config, instances);
    });
  } else {
    callback(null, config, instances);
  }
};

/**
 * If the widget is global, get the new auto generated instance
 *
 * @param {String} widgetType The widget type
 * @param {Object} backup The backup information
 * @param {Object} occ The OCC requester
 * @param {Object} config The widget.json
 * @param {Array} instances The new widget instances
 * @param {Function} callback The callback function
 */
var getGlobalInstance = function (widgetType, backup, occ, config, instances, callback) {
  if (config.global && backup.widgetIds && backup.widgetIds.length) {
    winston.info('Getting widget new global instance');
    occ.request('/widgetDescriptors/instances?source=101', function (error, response) {
      if (error || response.errorCode) callback(error || response.message);
      // store widget instances information
      var widget = response.items.find(function (widget) {
        return widget.widgetType === widgetType;
      });

      if (widget) {
        instances = {};
        instances[backup.widgetIds[0]] = widget.instances[0].id;
        callback(null, instances, widget);
      } else {
        callback('No instances installed for this widget');
      }
    });
  } else {
    callback(null, instances, null);
  }
};

/**
 * Restore site associations for global widgets.
 *
 * @param {String} widgetType The widget type
 * @param {Object} backup The backup information
 * @param {Object} occ The OCC requester
 * @param {Array} instances The new widget instances
 * @param {Object} globalWidget The global widget instance
 * @param {Function} callback The callback function
 */
var restoreSiteAssociations = function (widgetType, backup, occ, instances, globalWidget, callback) {
  if (globalWidget && backup.widget && backup.widget.sites && backup.widget.sites.length) {
    var siteIds = backup.widget.sites.map(function(site){
      return site.repositoryId;
    });

    // update the global widget sites associations
    var options = {
      api: util.format('/widgetDescriptors/%s/updateSiteAssociations', globalWidget.id),
      method: 'post',
      body: {
        sites: siteIds
      }
    };
    winston.info('Restoring the previous global widget site associations');
    occ.request(options, function (error, response) {
      if (error || response.errorCode) callback(error || response.message);
      callback(null, instances);
    });
  } else {
    callback(null, instances);
  }
};

/**
 * Gets the new widget configuration schema.
 *
 * @param {String} widgetType The widget type
 * @param {Object} backup The backup information
 * @param {Object} occ The OCC requester
 * @param {Array} instances The new widget instances
 * @param {Function} callback The callback function
 */
var getWidgetConfigurations = function (widgetType, backup, occ, instances, callback) {
  if (instances) {
    winston.info('Retrieving new widget configurations');
    occ.request('/widgetDescriptors/instances?source=101', function (error, response) {
      if (error || response.errorCode) callback(error || response.message);

      // find the widget instance
      var widget = response.items.find(function (instance) {
        return instance.widgetType === widgetType;
      });

      if (widget) {
        // retrieve the widget configuration schema
        occ.request(util.format('/widgetDescriptors/%s/config', widget.id), function (error, response) {
          if (error || response.errorCode) callback(error || response.message);
          callback(null, instances, response.values);
        });
      } else {
        callback('Widget configurations not found');
      }
    });
  } else {
    callback(null, instances, null);
  }
};

/**
 * Restore widget configuration.
 *
 * @param {String} widgetType The widget type
 * @param {Object} backup The backup information
 * @param {Object} occ The OCC requester
 * @param {Array} instances The new widget instances
 * @param {Object} configuration Configuration schema
 * @param {Function} callback The callback function
 */
var restoreConfiguration = function (widgetType, backup, occ, instances, configuration, callback) {
  if (instances && configuration) {
    winston.info('Restoring widgets previous configurations');
    async.forEach(backup.widgetIds, function (instanceId, cb) {
      var settings = backup.settings[instanceId];
      if (settings && Object.keys(settings).length) {
        // get the instance information
        var instance = backup.widget.instances.find(function (instance) {
          return instance.id === instanceId;
        });

        // add the new required configurations
        configuration.forEach(function (config) {
          if (config.required && !settings.hasOwnProperty(config.name)) {
            settings[config.name] = config.defaultValue;
          }
        });

        // update the instance configuration
        var request = {
          'api': util.format('/widgets/%s', instances[instanceId]),
          'method': 'put',
          'body': {
            'widgetConfig': {
              'name': instance.displayName,
              'notes': '',
              'settings': settings
            }
          },
          'headers': {
            'x-ccasset-language': 'en'
          }
        };
        occ.request(request, function (error, response) {
          if (error){
            cb(error);
          }else if (response.errorCode || (response.status && parseInt(response.status) >= 400)) {
            winston.warn('Could not restore the settings for widget %s', instanceId);
            winston.warn('Configuration: %s', JSON.stringify(settings, null, 2));
            winston.error(response.message);
            cb();
          } else {
            winston.info('Widget %s successfully restored', instanceId);
            cb();
          }
        });
      } else {
        winston.warn('No settings to be updated for widget %s', instanceId);
        cb();
      }
    }, function (error) {
      if (error) callback(error);
      callback();
    });
  } else {
    callback();
  }
};

/**
 * Restores a widget backup
 *
 * @param {String} widgetType The widget type
 * @param {Object} backup The backup information
 * @param {Object} occ The OCC requester
 * @param {Function} callback The callback function
 */
module.exports = function (widgetType, backup, occ, callback) {
  async.waterfall([
    async.apply(getWidgetConfig, widgetType, backup, occ),
    async.apply(createInstances, widgetType, backup, occ),
    async.apply(placeInstances, widgetType, backup, occ),
    async.apply(getGlobalInstance, widgetType, backup, occ),
    async.apply(restoreSiteAssociations, widgetType, backup, occ),
    async.apply(getWidgetConfigurations, widgetType, backup, occ),
    async.apply(restoreConfiguration, widgetType, backup, occ)
  ], callback);
};
