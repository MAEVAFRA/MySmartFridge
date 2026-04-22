const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProductCategory = sequelize.define('ProductCategory', {
    id:                     { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name:                   { type: DataTypes.STRING(100), allowNull: false },
    icon:                   { type: DataTypes.STRING(50) },
    color:                  { type: DataTypes.STRING(20) },
    avg_shelf_days:         { type: DataTypes.INTEGER },
    avg_shelf_days_opened:  { type: DataTypes.INTEGER },
    avg_shelf_days_freezer: { type: DataTypes.INTEGER },
    storage_instructions:   { type: DataTypes.TEXT },
    parent_id:              { type: DataTypes.INTEGER }, // auto-référence sous-catégories
    is_system:              { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'product_categories',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  });

  return ProductCategory;
};
