const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Household = sequelize.define('Household', {
    id:                      { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name:                    { type: DataTypes.STRING(150), allowNull: false },
    avatar_url:              { type: DataTypes.TEXT },
    invite_token:            { type: DataTypes.STRING(50), unique: true },
    invite_token_expires_at: { type: DataTypes.DATE },
    currency:                { type: DataTypes.STRING(10), defaultValue: 'EUR' },
    monthly_budget:          { type: DataTypes.FLOAT },
    created_by:              { type: DataTypes.INTEGER },
    deleted_at:              { type: DataTypes.DATE },
  }, {
    tableName: 'households',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return Household;
};
