/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('ResponseData', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      unique: true,
      autoIncrement: true,
      field: 'rda_id'
    },
    data: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '{ "sample": true }',
      field: 'rda_data'
    },
    isDefault: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'rda_is_default'
    },
    descriptiorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'des_descriptor',
        key: 'des_id'
      },
      field: 'des_id'
    },
    rdaCreatedAt: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rda_created_at'
    },
    rdaUpdatedAt: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rda_updated_at'
    }
  }, {
    tableName: 'rda_response_data',
    createdAt: 'rda_created_at',
    updatedAt: 'rda_updated_at'
  });
};
