const { DataTypes } = require('sequelize');

module.exports.Expense = (sequelize) => {
  return sequelize.define('Expense', {
    id:                { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    household_id:      { type: DataTypes.INTEGER, allowNull: false },
    paid_by:           { type: DataTypes.INTEGER },
    scan_id:           { type: DataTypes.INTEGER },
    amount:            { type: DataTypes.FLOAT, allowNull: false },
    currency:          { type: DataTypes.STRING(10), defaultValue: 'EUR' },
    label:             { type: DataTypes.STRING(300) },
    category:          { type: DataTypes.STRING(100) },
    store_name:        { type: DataTypes.STRING(150) },
    payment_method:    { type: DataTypes.STRING(50) },
    receipt_url:       { type: DataTypes.TEXT },
    is_recurring:      { type: DataTypes.BOOLEAN, defaultValue: false },
    recurrence_period: { type: DataTypes.STRING(30) },
    expense_date:      { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
    deleted_at:        { type: DataTypes.DATE },
  }, {
    tableName: 'expenses',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
};

module.exports.ExpenseSplit = (sequelize) => {
  return sequelize.define('ExpenseSplit', {
    id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    expense_id:    { type: DataTypes.INTEGER, allowNull: false },
    user_id:       { type: DataTypes.INTEGER, allowNull: false },
    share_amount:  { type: DataTypes.FLOAT },
    share_percent: { type: DataTypes.FLOAT },
    settled:       { type: DataTypes.BOOLEAN, defaultValue: false },
    settled_at:    { type: DataTypes.DATE },
    settled_by:    { type: DataTypes.INTEGER },
    note:          { type: DataTypes.STRING(300) },
  }, { tableName: 'expense_splits', timestamps: false });
};

module.exports.ExpenseCategoryBudget = (sequelize) => {
  return sequelize.define('ExpenseCategoryBudget', {
    id:               { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    household_id:     { type: DataTypes.INTEGER, allowNull: false },
    category:         { type: DataTypes.STRING(100), allowNull: false },
    monthly_limit:    { type: DataTypes.FLOAT, allowNull: false },
    alert_at_percent: { type: DataTypes.INTEGER, defaultValue: 80 },
  }, {
    tableName: 'expense_category_budgets',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  });
};

module.exports.ShoppingList = (sequelize) => {
  return sequelize.define('ShoppingList', {
    id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    household_id:  { type: DataTypes.INTEGER, allowNull: false },
    name:          { type: DataTypes.STRING(150), defaultValue: 'Liste de courses' },
    is_default:    { type: DataTypes.BOOLEAN, defaultValue: false },
    display_order: { type: DataTypes.INTEGER, defaultValue: 0 },
    completed_at:  { type: DataTypes.DATE },
    created_by:    { type: DataTypes.INTEGER },
    deleted_at:    { type: DataTypes.DATE },
  }, {
    tableName: 'shopping_lists',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
};

module.exports.ShoppingItem = (sequelize) => {
  return sequelize.define('ShoppingItem', {
    id:               { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    list_id:          { type: DataTypes.INTEGER, allowNull: false },
    product_id:       { type: DataTypes.INTEGER },
    category_id:      { type: DataTypes.INTEGER },
    barcode:          { type: DataTypes.STRING(100) },
    name:             { type: DataTypes.STRING(200), allowNull: false },
    quantity:         { type: DataTypes.FLOAT, defaultValue: 1 },
    unit:             { type: DataTypes.STRING(50), defaultValue: 'unité' },
    estimated_price:  { type: DataTypes.FLOAT },
    store_preference: { type: DataTypes.STRING(150) },
    notes:            { type: DataTypes.STRING(500) },
    checked:          { type: DataTypes.BOOLEAN, defaultValue: false },
    checked_at:       { type: DataTypes.DATE },
    checked_by:       { type: DataTypes.INTEGER },
    added_by:         { type: DataTypes.INTEGER },
    display_order:    { type: DataTypes.INTEGER, defaultValue: 0 },
  }, {
    tableName: 'shopping_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  });
};
