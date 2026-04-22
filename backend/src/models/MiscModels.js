const { DataTypes } = require('sequelize');

module.exports.Notification = (sequelize) => {
  return sequelize.define('Notification', {
    id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id:      { type: DataTypes.INTEGER, allowNull: false },
    household_id: { type: DataTypes.INTEGER },
    type:         { type: DataTypes.STRING(50) },
    title:        { type: DataTypes.STRING(300) },
    message:      { type: DataTypes.TEXT },
    payload:      { type: DataTypes.TEXT },
    action_url:   { type: DataTypes.STRING(500) },
    priority:     { type: DataTypes.STRING(20), defaultValue: 'normal' },
    channel:      { type: DataTypes.STRING(20), defaultValue: 'push' },
    read:         { type: DataTypes.BOOLEAN, defaultValue: false },
    read_at:      { type: DataTypes.DATE },
    expires_at:   { type: DataTypes.DATE },
    sent_at:      { type: DataTypes.DATE },
  }, {
    tableName: 'notifications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  });
};

module.exports.NotifSettings = (sequelize) => {
  return sequelize.define('NotifSettings', {
    id:                         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id:                    { type: DataTypes.INTEGER, allowNull: false, unique: true },
    expiry_warning_days:        { type: DataTypes.INTEGER, defaultValue: 3 },
    stock_low_enabled:          { type: DataTypes.BOOLEAN, defaultValue: true },
    daily_summary:              { type: DataTypes.BOOLEAN, defaultValue: false },
    daily_summary_time:         { type: DataTypes.TIME, defaultValue: '08:00' },
    weekly_report:              { type: DataTypes.BOOLEAN, defaultValue: false },
    weekly_report_day:          { type: DataTypes.STRING(15), defaultValue: 'monday' },
    push_enabled:               { type: DataTypes.BOOLEAN, defaultValue: true },
    email_enabled:              { type: DataTypes.BOOLEAN, defaultValue: false },
    budget_alert_enabled:       { type: DataTypes.BOOLEAN, defaultValue: true },
    recipe_suggestions_enabled: { type: DataTypes.BOOLEAN, defaultValue: true },
    quiet_hours_start:          { type: DataTypes.TIME, defaultValue: '22:00' },
    quiet_hours_end:            { type: DataTypes.TIME, defaultValue: '08:00' },
  }, {
    tableName: 'notif_settings',
    timestamps: true,
    createdAt: false,
    updatedAt: 'updated_at',
  });
};

module.exports.ProductConsumptionLog = (sequelize) => {
  return sequelize.define('ProductConsumptionLog', {
    id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    household_id:  { type: DataTypes.INTEGER },
    user_id:       { type: DataTypes.INTEGER },
    product_id:    { type: DataTypes.INTEGER },
    category_id:   { type: DataTypes.INTEGER },
    action:        { type: DataTypes.STRING(50) }, // consumed | expired | thrown | added | updated
    quantity:      { type: DataTypes.FLOAT },
    unit:          { type: DataTypes.STRING(50) },
    price_at_time: { type: DataTypes.FLOAT },
    notes:         { type: DataTypes.TEXT },
    logged_at:     { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, { tableName: 'product_consumption_logs', timestamps: false });
};

module.exports.MonthlyStatsSnapshot = (sequelize) => {
  return sequelize.define('MonthlyStatsSnapshot', {
    id:                      { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    household_id:            { type: DataTypes.INTEGER, allowNull: false },
    year:                    { type: DataTypes.INTEGER, allowNull: false },
    month:                   { type: DataTypes.INTEGER, allowNull: false },
    total_spent:             { type: DataTypes.FLOAT, defaultValue: 0 },
    total_products_added:    { type: DataTypes.INTEGER, defaultValue: 0 },
    total_products_consumed: { type: DataTypes.INTEGER, defaultValue: 0 },
    total_products_expired:  { type: DataTypes.INTEGER, defaultValue: 0 },
    total_products_thrown:   { type: DataTypes.INTEGER, defaultValue: 0 },
    waste_amount_eur:        { type: DataTypes.FLOAT, defaultValue: 0 },
    most_bought_category:    { type: DataTypes.STRING(100) },
    recipes_cooked:          { type: DataTypes.INTEGER, defaultValue: 0 },
  }, {
    tableName: 'monthly_stats_snapshots',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [{ unique: true, fields: ['household_id', 'year', 'month'] }],
  });
};

module.exports.AuditLog = (sequelize) => {
  return sequelize.define('AuditLog', {
    id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id:      { type: DataTypes.INTEGER },
    household_id: { type: DataTypes.INTEGER },
    action:       { type: DataTypes.STRING(100), allowNull: false },
    entity_type:  { type: DataTypes.STRING(100) },
    entity_id:    { type: DataTypes.STRING(100) },
    old_values:   { type: DataTypes.TEXT },
    new_values:   { type: DataTypes.TEXT },
    ip_address:   { type: DataTypes.STRING(50) },
    user_agent:   { type: DataTypes.TEXT },
  }, {
    tableName: 'audit_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  });
};
