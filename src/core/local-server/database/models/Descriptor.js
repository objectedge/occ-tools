/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  const Descriptor = sequelize.define('Descriptor', {
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
    requestStatusCode: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'des_request_status_code'
    },
    responseStatusCode: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'des_response_status_code'
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
    createdAt: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'des_created_at'
    },
    updatedAt: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'des_updated_at'
    }
  }, {
    tableName: 'des_descriptor',
    createdAt: 'des_created_at',
    updatedAt: 'des_updated_at'
  });

  Descriptor.associate = function (models) {
    models.Descriptor.belongsTo(models.MethodType, {
      onDelete: "CASCADE",
      foreignKey: {
        name: 'methodTypeId',
        allowNull: false
      }
    });

    models.Descriptor.belongsTo(models.Method, {
      onDelete: "CASCADE",
      foreignKey: {
        name: 'methodId',
        allowNull: false
      }
    });

    models.Descriptor.hasOne(models.RequestBody, {
      foreignKey: {
        name: 'id',
        allowNull: false
      }
    });

    models.Descriptor.hasOne(models.RequestHeaders, {
      foreignKey: {
        name: 'id',
        allowNull: false
      }
    });

    models.Descriptor.hasOne(models.RequestParameters, {
      foreignKey: {
        name: 'id',
        allowNull: false
      }
    });

    models.Descriptor.hasOne(models.ResponseData, {
      foreignKey: {
        name: 'id',
        allowNull: false
      }
    });

    models.Descriptor.hasOne(models.ResponseHeaders, {
      foreignKey: {
        name: 'id',
        allowNull: false
      }
    });
  };

  return Descriptor;
};
