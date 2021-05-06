/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  const RequestParameters = sequelize.define('RequestParameters', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      unique: true,
      autoIncrement: true,
      field: 'rqp_id'
    },
    key: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rqp_key'
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rqp_value'
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
      field: 'rqp_created_at'
    },
    updatedAt: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rqp_updated_at'
    }
  }, {
    tableName: 'rqp_request_parameters',
    createdAt: 'rqp_created_at',
    updatedAt: 'rqp_updated_at'
  });

  RequestParameters.associate = function (models) {
    models.RequestParameters.belongsTo(models.Descriptor, {
      onDelete: "CASCADE",
      foreignKey: {
        name: 'descriptorId',
        allowNull: false
      }
    });
  };

  return RequestParameters;
};
