'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Emplacements
    await queryInterface.bulkInsert('locations', [
      {
        name: 'Frigo',
        icon: 'refrigerator',
        color: '#3B82F6',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Congélateur',
        icon: 'snowflake',
        color: '#06B6D4',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Placard',
        icon: 'archive',
        color: '#F59E0B',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Catégories
    await queryInterface.bulkInsert('categories', [
      { name: 'Fruits & Légumes', icon: 'apple', color: '#22C55E', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Viandes', icon: 'beef', color: '#EF4444', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Poissons', icon: 'fish', color: '#3B82F6', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Produits laitiers', icon: 'milk', color: '#F8FAFC', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Boissons', icon: 'cup-soda', color: '#8B5CF6', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Épicerie', icon: 'wheat', color: '#F59E0B', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Surgelés', icon: 'snowflake', color: '#06B6D4', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Condiments', icon: 'droplet', color: '#EC4899', createdAt: new Date(), updatedAt: new Date() },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('categories', null, {});
    await queryInterface.bulkDelete('locations', null, {});
  },
};
