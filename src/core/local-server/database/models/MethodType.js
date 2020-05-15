/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  const MethodType = sequelize.define('MethodType', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      unique: true,
      autoIncrement: true,
      field: 'mty_id'
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'mty_name'
    },
    createdAt: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'mty_created_at'
    },
    updatedAt: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'mty_updated_at'
    }
  }, {
    tableName: 'mty_method_type',
    createdAt: 'mty_created_at',
    updatedAt: 'mty_updated_at'
  });

  MethodType.associate = function(models) {
    models.MethodType.hasMany(models.Method, {
      foreignKey: {
        name: 'methodTypeId',
        allowNull: false
      }
    });

    models.MethodType.hasMany(models.Descriptor, {
      foreignKey: {
        name: 'id',
        allowNull: false
      }
    });
  };

  return MethodType;
};
