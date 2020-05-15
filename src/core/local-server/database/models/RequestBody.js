/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  const RequestBody = sequelize.define('RequestBody', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      unique: true,
      autoIncrement: true,
      field: 'rqb_id'
    },
    key: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rqb_key'
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rqb_value'
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
      field: 'rqb_created_at'
    },
    updatedAt: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rqb_updated_at'
    }
  }, {
    tableName: 'rqb_request_body',
    createdAt: 'rqb_created_at',
    updatedAt: 'rqb_updated_at'
  });

  RequestBody.associate = function (models) {
    models.RequestBody.belongsTo(models.Descriptor, {
      onDelete: "CASCADE",
      foreignKey: {
        name: 'descriptorId',
        allowNull: false
      }
    });
  };

  return RequestBody;
};
