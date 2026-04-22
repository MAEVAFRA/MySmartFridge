const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Location = sequelize.define('Location', {
    id:                  { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    household_id:        { type: DataTypes.INTEGER, allowNull: false },
    name:                { type: DataTypes.STRING(100), allowNull: false },
    type:                { type: DataTypes.STRING(30) }, // fridge | freezer | pantry | cellar | other
    icon:                { type: DataTypes.STRING(50), defaultValue: '🗄️' },
    color:               { type: DataTypes.STRING(20), defaultValue: '#6366f1' },
    temperature_celsius: { type: DataTypes.FLOAT },
    display_order:       { type: DataTypes.INTEGER, defaultValue: 0 },
    is_default:          { type: DataTypes.BOOLEAN, defaultValue: false },
    deleted_at:          { type: DataTypes.DATE },
  }, {
    tableName: 'locations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return Location;
};
