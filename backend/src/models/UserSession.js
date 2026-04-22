const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserSession = sequelize.define('UserSession', {
    id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id:       { type: DataTypes.INTEGER, allowNull: false },
    refresh_token: { type: DataTypes.STRING(500), allowNull: false, unique: true },
    device_type:   { type: DataTypes.STRING(50) },
    device_name:   { type: DataTypes.STRING(100) },
    ip_address:    { type: DataTypes.STRING(50) },
    user_agent:    { type: DataTypes.TEXT },
    expires_at:    { type: DataTypes.DATE, allowNull: false },
    revoked_at:    { type: DataTypes.DATE },
  }, {
    tableName: 'user_sessions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  });

  return UserSession;
};
