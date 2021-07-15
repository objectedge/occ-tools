const { pick, omit } = require('lodash');

const {
  compareObjects,
  arrayToMapById,
  constants,
} = require('../utils');

const getChangedAttributes = (localProperty, remoteProperty, editableAttributes) => {
  const attributes =  editableAttributes ?
    editableAttributes.concat(constants.ADDITIONAL_EDITABLE_ATTRIBUTES) :
    Object.keys(localProperty);
  const compareAttributes = (attribute) => !compareObjects(localProperty[attribute], remoteProperty[attribute]);
  const changedAttributes = attributes.filter(compareAttributes);

  return pick(localProperty, changedAttributes);
};

const getProperties = (mainType, type) => {
  if (mainType === constants.SHOPPER_TYPE || mainType === constants.ORDER_TYPE) {
    return type.properties;
  } else if (mainType === constants.ITEM_TYPE) {
    return arrayToMapById(type.specifications);
  }

  return null;
};

const getChangedProperties = (localProperties, remoteProperties) => {
  const remotePropertiesKeys = Object.keys(remoteProperties);
  const localPropertiesKeys = Object.keys(localProperties);

  const changedProperties = (property) => {
    if (!remotePropertiesKeys.includes(property)) {
      return true;
    } else {
      const localProperty = localProperties[property];
      const remoteProperty = remoteProperties[property];

      return !compareObjects(localProperty, remoteProperty);
    }
  };

  const properties = localPropertiesKeys
    .filter(changedProperties)
    .map((propertyName) => {
      const localProperty = localProperties[propertyName];
      let newProperty = null;

      if (remotePropertiesKeys.includes(propertyName)) {
        const remoteProperty = remoteProperties[propertyName];
        const changedAttributes = getChangedAttributes(localProperty, remoteProperty, remoteProperty.editableAttributes);

        if (!compareObjects(changedAttributes, {})) {
          newProperty = {
            id: propertyName,
            ...changedAttributes,
          };
        }
      } else {
        newProperty = {
          id: propertyName,
          ...omit(localProperty, constants.ATTRIBUTES_NOT_ALLOWED_FOR_CREATION),
        };
        if (!newProperty.uiEditorType) {
          newProperty.uiEditorType = newProperty.type;
        }
      }

      return newProperty;
    })
    .filter((p) => p !== null);

  return properties;
};

module.exports = {
  getChangedProperties,
  getProperties
};
