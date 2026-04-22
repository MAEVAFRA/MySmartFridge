const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Product = sequelize.define('Product', {
    id:                { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    household_id:      { type: DataTypes.INTEGER, allowNull: false },
    location_id:       { type: DataTypes.INTEGER },
    category_id:       { type: DataTypes.INTEGER },
    added_by:          { type: DataTypes.INTEGER },
    scan_id:           { type: DataTypes.INTEGER },
    name:              { type: DataTypes.STRING(200), allowNull: false },
    brand:             { type: DataTypes.STRING(100) },
    barcode:           { type: DataTypes.STRING(100) },
    quantity:          { type: DataTypes.FLOAT, defaultValue: 1 },
    quantity_min:      { type: DataTypes.FLOAT, defaultValue: 0 },
    unit:              { type: DataTypes.STRING(30), defaultValue: 'unité' },
    expires_at:        { type: DataTypes.DATEONLY },
    expiry_source:     { type: DataTypes.STRING(50) }, // manual | scan | barcode_db | category_avg
    opened_at:         { type: DataTypes.DATEONLY },
    price:             { type: DataTypes.FLOAT },
    price_per_unit:    { type: DataTypes.FLOAT },
    image_url:         { type: DataTypes.TEXT },
    thumbnail_url:     { type: DataTypes.TEXT },
    notes:             { type: DataTypes.TEXT },
    is_shared:         { type: DataTypes.BOOLEAN, defaultValue: true },
    weight_g:          { type: DataTypes.FLOAT },
    volume_ml:         { type: DataTypes.FLOAT },
    calories_per_100g: { type: DataTypes.FLOAT },
    deleted_at:        { type: DataTypes.DATE },
  }, {
    tableName: 'products',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return Product;
};
