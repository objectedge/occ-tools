/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  const Method = sequelize.define('Method', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      unique: true,
      autoIncrement: true,
      field: 'met_id'
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'met_summary'
    },
    operationId: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'met_operationId'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'met_description'
    },
    produces: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: 'application/json',
      field: 'met_produces'
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
    schemaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'sch_schema',
        key: 'sch_id'
      },
      field: 'sch_id'
    },
    createdAt: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'met_created_at'
    },
    updatedAt: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'met_updated_at'
    }
  }, {
    tableName: 'met_method',
    createdAt: 'met_created_at',
    updatedAt: 'met_updated_at'
  });

  Method.associate = function (models) {
    models.Method.belongsTo(models.MethodType, {
      onDelete: "CASCADE",
      foreignKey: {
        name: 'methodTypeId',
        allowNull: false
      }
    });

    models.Method.belongsTo(models.Schema, {
      onDelete: "CASCADE",
      foreignKey: {
        name: 'schemaId',
        allowNull: false
      }
    });

    models.Method.hasMany(models.AllowedParameters, {
      foreignKey: {
        name: 'id',
        allowNull: false
      }
    });

    models.Method.hasOne(models.Descriptor, {
      foreignKey: {
        name: 'id',
        allowNull: false
      }
    });
  };

  return Method;
};
