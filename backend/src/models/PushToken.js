const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PushToken = sequelize.define('PushToken', {
    id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id:     { type: DataTypes.INTEGER, allowNull: false },
    token:       { type: DataTypes.TEXT, allowNull: false },
    platform:    { type: DataTypes.STRING(20) }, // web | ios | android
    device_name: { type: DataTypes.STRING(100) },
    is_active:   { type: DataTypes.BOOLEAN, defaultValue: true },
    last_used_at:{ type: DataTypes.DATE },
  }, {
    tableName: 'push_tokens',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  });

  return PushToken;
};
