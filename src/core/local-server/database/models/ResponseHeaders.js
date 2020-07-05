/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  const ResponseHeaders = sequelize.define('ResponseHeaders', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      unique: true,
      autoIncrement: true,
      field: 'rph_id'
    },
    key: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rph_key'
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rph_value'
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
      field: 'rph_created_at'
    },
    updatedAt: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rph_updated_at'
    }
  }, {
    tableName: 'rph_response_headers',
    createdAt: 'rph_created_at',
    updatedAt: 'rph_updated_at'
  });

  ResponseHeaders.associate = function (models) {
    models.ResponseHeaders.belongsTo(models.Descriptor, {
      onDelete: "CASCADE",
      foreignKey: {
        name: 'descriptorId',
        allowNull: false
      }
    });
  };

  return ResponseHeaders;
};
