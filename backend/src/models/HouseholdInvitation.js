const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const HouseholdInvitation = sequelize.define('HouseholdInvitation', {
    id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    household_id: { type: DataTypes.INTEGER, allowNull: false },
    invited_by:   { type: DataTypes.INTEGER },
    email:        { type: DataTypes.STRING(255), allowNull: false },
    role:         { type: DataTypes.STRING(30), defaultValue: 'member' },
    token:        { type: DataTypes.STRING(255), allowNull: false, unique: true },
    expires_at:   { type: DataTypes.DATE, allowNull: false },
    accepted_at:  { type: DataTypes.DATE },
    declined_at:  { type: DataTypes.DATE },
  }, {
    tableName: 'household_invitations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  });

  return HouseholdInvitation;
};
