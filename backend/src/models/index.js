const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  }
);

// Import des modèles
const Location = require('./Location')(sequelize);
const Category = require('./Category')(sequelize);
const Product = require('./Product')(sequelize);
const User = require('./User')(sequelize);

// Associations
Location.hasMany(Product, { foreignKey: 'locationId', as: 'products' });
Product.belongsTo(Location, { foreignKey: 'locationId', as: 'location' });

Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

User.hasMany(Product, { foreignKey: 'userId', as: 'products' });
Product.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  sequelize,
  Sequelize,
  Location,
  Category,
  Product,
  User,
};
