const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Location = sequelize.define('Location', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    icon: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Nom de l\'icône (ex: fridge, snowflake, cabinet)',
    },
    color: {
      type: DataTypes.STRING(7),
      allowNull: true,
      comment: 'Couleur en hex (ex: #3B82F6)',
    },
  }, {
    tableName: 'locations',
    timestamps: true,
  });

  return Location;
};
