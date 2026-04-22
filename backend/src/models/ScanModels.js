const { DataTypes } = require('sequelize');

module.exports.ProductTag = (sequelize) => {
  return sequelize.define('ProductTag', {
    id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    tag:        { type: DataTypes.STRING(100), allowNull: false },
  }, { tableName: 'product_tags', timestamps: false });
};

module.exports.BarcodeCache = (sequelize) => {
  return sequelize.define('BarcodeCache', {
    id:                { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    barcode:           { type: DataTypes.STRING(100), allowNull: false, unique: true },
    name:              { type: DataTypes.STRING(200) },
    brand:             { type: DataTypes.STRING(100) },
    image_url:         { type: DataTypes.TEXT },
    category_id:       { type: DataTypes.INTEGER },
    weight_g:          { type: DataTypes.FLOAT },
    volume_ml:         { type: DataTypes.FLOAT },
    calories_per_100g: { type: DataTypes.FLOAT },
    ingredients:       { type: DataTypes.TEXT },
    allergens:         { type: DataTypes.STRING(500) },
    source:            { type: DataTypes.STRING(50) },
  }, {
    tableName: 'barcode_cache',
    timestamps: true,
    createdAt: 'fetched_at',
    updatedAt: 'updated_at',
  });
};

module.exports.ReceiptScan = (sequelize) => {
  return sequelize.define('ReceiptScan', {
    id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    household_id:   { type: DataTypes.INTEGER, allowNull: false },
    scanned_by:     { type: DataTypes.INTEGER },
    image_url:      { type: DataTypes.TEXT },
    store_name:     { type: DataTypes.STRING(150) },
    total_amount:   { type: DataTypes.FLOAT },
    scanned_at:     { type: DataTypes.DATEONLY },
    status:         { type: DataTypes.STRING(30), defaultValue: 'pending' },
    ocr_confidence: { type: DataTypes.FLOAT },
    raw_ocr_text:   { type: DataTypes.TEXT },
  }, {
    tableName: 'receipt_scans',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  });
};

module.exports.ReceiptScanItem = (sequelize) => {
  return sequelize.define('ReceiptScanItem', {
    id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    scan_id:     { type: DataTypes.INTEGER, allowNull: false },
    raw_text:    { type: DataTypes.STRING(500) },
    name:        { type: DataTypes.STRING(200) },
    quantity:    { type: DataTypes.FLOAT, defaultValue: 1 },
    unit:        { type: DataTypes.STRING(30) },
    unit_price:  { type: DataTypes.FLOAT },
    total_price: { type: DataTypes.FLOAT },
    confidence:  { type: DataTypes.FLOAT },
    product_id:  { type: DataTypes.INTEGER },
    status:      { type: DataTypes.STRING(30), defaultValue: 'pending' },
  }, { tableName: 'receipt_scan_items', timestamps: false });
};
