/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Descriptor', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      unique: true,
      autoIncrement: true,
      field: 'des_id'
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'des_url'
    },
    enabled: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: '0',
      field: 'des_enabled'
    },
    requestParameters: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'des_request_parameters'
    },
    requestStatusCode: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'des_request_status_code'
    },
    requestHeaders: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'des_request_headers'
    },
    requestBody: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'des_request_body'
    },
    responseStatusCode: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'des_response_status_code'
    },
    responseHeaders: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'des_response_headers'
    },
    methodTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'mty_method_type',
        key: 'mty_id'
      },
      field: 'mty_id'
    },
    methodId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'met_method',
        key: 'met_id'
      },
      field: 'met_id'
    },
    desCreatedAt: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'des_created_at'
    },
    desUpdatedAt: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'des_updated_at'
    }
  }, {
    tableName: 'des_descriptor',
    createdAt: 'des_created_at',
    updatedAt: 'des_updated_at'
  });
};
