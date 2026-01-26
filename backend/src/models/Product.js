const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 1,
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: 'unité',
      comment: 'Unité de mesure (unité, kg, g, L, mL, etc.)',
    },
    expiryDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date de péremption',
    },
    barcode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Code-barres du produit',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    locationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'locations',
        key: 'id',
      },
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id',
      },
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
  }, {
    tableName: 'products',
    timestamps: true,
  });

  return Product;
};
