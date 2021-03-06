/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  const Schema = sequelize.define('Schema', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      unique: true,
      autoIncrement: true,
      field: 'sch_id'
    },
    path: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'sch_path'
    },
    occEnvId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'oce_occ_env',
        key: 'oce_id'
      },
      field: 'oce_id'
    },
    oceCreatedAt: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'oce_created_at'
    },
    oceUpdatedAt: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'oce_updated_at'
    }
  }, {
    tableName: 'sch_schema',
    createdAt: 'oce_created_at',
    updatedAt: 'oce_updated_at'
  });

  Schema.associate = function(models) {
    models.Schema.hasMany(models.Method, {
      foreignKey: {
        name: 'schemaId',
        allowNull: false
      }
    });

    models.Schema.belongsTo(models.OccEnv, {
      onDelete: "CASCADE",
      foreignKey: {
        name: 'occEnvId',
        allowNull: false
      }
    });
  };

  return Schema;
};
