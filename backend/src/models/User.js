const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id:                   { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name:                 { type: DataTypes.STRING(100), allowNull: false },
    email:                { type: DataTypes.STRING(255), allowNull: false, unique: true },
    password_hash:        { type: DataTypes.STRING(255), allowNull: false },
    avatar_url:           { type: DataTypes.TEXT },
    locale:               { type: DataTypes.STRING(10), defaultValue: 'fr' },
    timezone:             { type: DataTypes.STRING(50), defaultValue: 'Europe/Paris' },
    preferred_currency:   { type: DataTypes.STRING(10), defaultValue: 'EUR' },
    language:             { type: DataTypes.STRING(10), defaultValue: 'fr' },
    theme:                { type: DataTypes.STRING(20), defaultValue: 'dark' },
    dietary_preferences:  { type: DataTypes.STRING(255) },
    allergies:            { type: DataTypes.STRING(255) },
    is_active:            { type: DataTypes.BOOLEAN, defaultValue: true },
    last_login_at:        { type: DataTypes.DATE },
    email_verified_at:    { type: DataTypes.DATE },
    deleted_at:           { type: DataTypes.DATE },
  }, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return User;
};
