module.exports = {
  SHOPPER_TYPE: 'shopper',
  ORDER_TYPE: 'order',
  PRODUCT_TYPE: 'product',
  BASE_PRODUCT_TYPE: 'product',
  PRODUCT_TYPE_METADATA: 'product',
  BASE_ORDER_TYPE: 'order',
  BASE_SHOPPER_TYPE: 'user',
  ITEM_TYPE: 'item',
  ID_PROPERTY: 'id',
  ATTRIBUTES_NOT_ALLOWED_FOR_CREATION: [ 'writable', 'length', 'editableAttributes' ],
  ADDITIONAL_EDITABLE_ATTRIBUTES: [ 'values' ],
  SHOPPER_PROPERTIES_TO_REMOVE_DEFAULT: ['registrationDate', 'lastPasswordUpdate'],
  OCC_LANGUAGE_HEADER: 'X-CCAsset-Language',
  HTTP_METHOD_POST: 'post',
  HTTP_METHOD_DELETE: 'delete',
  HTTP_METHOD_PUT: 'put',
  HTTP_METHOD_GET: 'get'
};
