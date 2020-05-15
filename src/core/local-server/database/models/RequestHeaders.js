/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  const RequestHeaders = sequelize.define('RequestHeaders', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      unique: true,
      autoIncrement: true,
      field: 'rqh_id'
    },
    key: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rqh_key'
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rqh_value'
    },
    descriptorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'des_descriptor',
        key: 'des_id'
      },
      field: 'des_id'
    },
    createdAt: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rqh_created_at'
    },
    updatedAt: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rqh_updated_at'
    }
  }, {
    tableName: 'rqh_request_headers',
    createdAt: 'rqh_created_at',
    updatedAt: 'rqh_updated_at'
  });

  RequestHeaders.associate = function (models) {
    models.RequestHeaders.belongsTo(models.Descriptor, {
      onDelete: "CASCADE",
      foreignKey: {
        name: 'descriptorId',
        allowNull: false
      }
    });
  };

  return RequestHeaders;
};
