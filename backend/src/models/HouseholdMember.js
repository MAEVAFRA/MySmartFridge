const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const HouseholdMember = sequelize.define('HouseholdMember', {
    id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id:      { type: DataTypes.INTEGER, allowNull: false },
    household_id: { type: DataTypes.INTEGER, allowNull: false },
    role:         { type: DataTypes.STRING(30), defaultValue: 'member' }, // owner | admin | editor | viewer
    nickname:     { type: DataTypes.STRING(100) },
    color:        { type: DataTypes.STRING(20) },
    joined_at:    { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    last_seen_at: { type: DataTypes.DATE },
  }, {
    tableName: 'household_members',
    timestamps: false,
    indexes: [{ unique: true, fields: ['user_id', 'household_id'] }],
  });

  return HouseholdMember;
};
