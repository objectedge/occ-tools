/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('OccEnv', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      unique: true,
      autoIncrement: true,
      field: 'oce_id'
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'oce_name'
    },
    remoteUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'oce_remote_url'
    },
    localUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'oce_local_url'
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
    tableName: 'oce_occ_env',
    createdAt: 'oce_created_at',
    updatedAt: 'oce_updated_at'
  });
};
