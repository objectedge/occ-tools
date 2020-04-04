/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('AllowedParameters', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      unique: true,
      autoIncrement: true,
      field: 'apa_id'
    },
    in: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'apa_in'
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'apa_name'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'apa_description'
    },
    type: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'apa_type'
    },
    required: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'apa_required'
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
    apaCreatedAt: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'apa_created_at'
    },
    apaUpdatedAt: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'apa_updated_at'
    }
  }, {
    tableName: 'apa_allowed_parameters',
    createdAt: 'apa_created_at',
    updatedAt: 'apa_updated_at'
  });
};
