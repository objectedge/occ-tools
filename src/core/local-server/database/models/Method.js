/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Method', {
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
    metCreatedAt: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'met_created_at'
    },
    metUpdatedAt: {
      type: "BLOB",
      allowNull: true,
      field: 'met_updated_at'
    }
  }, {
    tableName: 'met_method',
    createdAt: 'met_created_at',
    updatedAt: 'met_updated_at'
  });
};
