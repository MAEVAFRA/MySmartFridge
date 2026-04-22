'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {

    // ─── USERS ────────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash('password123', 12);

    await queryInterface.bulkInsert('users', [
      {
        name: 'Alice Dupont',
        email: 'alice@demo.com',
        password_hash: passwordHash,
        locale: 'fr',
        timezone: 'Europe/Paris',
        preferred_currency: 'EUR',
        language: 'fr',
        theme: 'dark',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Bob Martin',
        email: 'bob@demo.com',
        password_hash: passwordHash,
        locale: 'fr',
        timezone: 'Europe/Paris',
        preferred_currency: 'EUR',
        language: 'fr',
        theme: 'dark',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    const users = await queryInterface.sequelize.query(
      'SELECT id FROM users ORDER BY id ASC',
      { type: Sequelize.QueryTypes.SELECT }
    );
    const aliceId = users[0].id;
    const bobId   = users[1].id;

    // ─── HOUSEHOLD ────────────────────────────────────────────────
    await queryInterface.bulkInsert('households', [
      {
        name: 'Appart Lyon',
        invite_token: 'DEMO1234',
        invite_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        currency: 'EUR',
        monthly_budget: 400,
        created_by: aliceId,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    const households = await queryInterface.sequelize.query(
      'SELECT id FROM households ORDER BY id ASC',
      { type: Sequelize.QueryTypes.SELECT }
    );
    const householdId = households[0].id;

    // ─── HOUSEHOLD MEMBERS ────────────────────────────────────────
    await queryInterface.bulkInsert('household_members', [
      { user_id: aliceId, household_id: householdId, role: 'owner', color: '#6366f1', joined_at: new Date() },
      { user_id: bobId,   household_id: householdId, role: 'member', color: '#22c55e', joined_at: new Date() },
    ]);

    // ─── NOTIF SETTINGS ───────────────────────────────────────────
    await queryInterface.bulkInsert('notif_settings', [
      { user_id: aliceId, expiry_warning_days: 3, stock_low_enabled: true, push_enabled: true, email_enabled: false, budget_alert_enabled: true, recipe_suggestions_enabled: true, updated_at: new Date() },
      { user_id: bobId,   expiry_warning_days: 2, stock_low_enabled: true, push_enabled: true, email_enabled: false, budget_alert_enabled: true, recipe_suggestions_enabled: true, updated_at: new Date() },
    ]);

    // ─── PRODUCT CATEGORIES ───────────────────────────────────────
    await queryInterface.bulkInsert('product_categories', [
      { name: 'Légumes',           icon: '🥦', color: '#22c55e', avg_shelf_days: 7,   avg_shelf_days_opened: 3,  avg_shelf_days_freezer: 180, is_system: true, created_at: new Date() },
      { name: 'Fruits',            icon: '🍎', color: '#f97316', avg_shelf_days: 5,   avg_shelf_days_opened: 3,  avg_shelf_days_freezer: 180, is_system: true, created_at: new Date() },
      { name: 'Viande',            icon: '🥩', color: '#ef4444', avg_shelf_days: 4,   avg_shelf_days_opened: 2,  avg_shelf_days_freezer: 90,  is_system: true, created_at: new Date() },
      { name: 'Poisson',           icon: '🐟', color: '#3b82f6', avg_shelf_days: 3,   avg_shelf_days_opened: 1,  avg_shelf_days_freezer: 90,  is_system: true, created_at: new Date() },
      { name: 'Produits laitiers', icon: '🥛', color: '#e2e8f0', avg_shelf_days: 14,  avg_shelf_days_opened: 5,  avg_shelf_days_freezer: 30,  is_system: true, created_at: new Date() },
      { name: 'Boissons',          icon: '🥤', color: '#06b6d4', avg_shelf_days: 30,  avg_shelf_days_opened: 7,  avg_shelf_days_freezer: null,is_system: true, created_at: new Date() },
      { name: 'Épicerie',          icon: '🫙', color: '#8b5cf6', avg_shelf_days: 180, avg_shelf_days_opened: 30, avg_shelf_days_freezer: null,is_system: true, created_at: new Date() },
      { name: 'Condiments',        icon: '🧂', color: '#f59e0b', avg_shelf_days: 365, avg_shelf_days_opened: 90, avg_shelf_days_freezer: null,is_system: true, created_at: new Date() },
      { name: 'Surgelés',          icon: '❄️', color: '#67e8f9', avg_shelf_days: 90,  avg_shelf_days_opened: null, avg_shelf_days_freezer: 90, is_system: true, created_at: new Date() },
      { name: 'Boulangerie',       icon: '🍞', color: '#d97706', avg_shelf_days: 3,   avg_shelf_days_opened: 2,  avg_shelf_days_freezer: 60,  is_system: true, created_at: new Date() },
      { name: 'Autre',             icon: '📦', color: '#6b7280', avg_shelf_days: 30,  avg_shelf_days_opened: 14, avg_shelf_days_freezer: 60,  is_system: true, created_at: new Date() },
    ]);

    const cats = await queryInterface.sequelize.query(
      "SELECT id, name FROM product_categories ORDER BY id ASC",
      { type: Sequelize.QueryTypes.SELECT }
    );
    const catMap = {};
    cats.forEach(c => { catMap[c.name] = c.id; });

    // ─── LOCATIONS ────────────────────────────────────────────────
    await queryInterface.bulkInsert('locations', [
      { household_id: householdId, name: 'Réfrigérateur', type: 'fridge',   icon: '🧊', color: '#3b82f6', temperature_celsius: 4,   display_order: 0, is_default: true,  created_at: new Date(), updated_at: new Date() },
      { household_id: householdId, name: 'Congélateur',   type: 'freezer',  icon: '❄️', color: '#06b6d4', temperature_celsius: -18, display_order: 1, is_default: false, created_at: new Date(), updated_at: new Date() },
      { household_id: householdId, name: 'Placard',       type: 'pantry',   icon: '🗄️', color: '#8b5cf6', temperature_celsius: null,display_order: 2, is_default: false, created_at: new Date(), updated_at: new Date() },
      { household_id: householdId, name: 'Placard épices',type: 'pantry',   icon: '🫙', color: '#f59e0b', temperature_celsius: null,display_order: 3, is_default: false, created_at: new Date(), updated_at: new Date() },
    ]);

    const locs = await queryInterface.sequelize.query(
      'SELECT id, name FROM locations ORDER BY id ASC',
      { type: Sequelize.QueryTypes.SELECT }
    );
    const locMap = {};
    locs.forEach(l => { locMap[l.name] = l.id; });

    // ─── PRODUCTS ─────────────────────────────────────────────────
    const today = new Date();
    const inDays = (n) => new Date(today.getTime() + n * 24 * 60 * 60 * 1000);

    await queryInterface.bulkInsert('products', [
      // Frigo
      { household_id: householdId, location_id: locMap['Réfrigérateur'], category_id: catMap['Légumes'],           added_by: aliceId, name: 'Tomates',          quantity: 4,   unit: 'unité', expires_at: inDays(5),  expiry_source: 'manual', price: 1.50, is_shared: true, created_at: new Date(), updated_at: new Date() },
      { household_id: householdId, location_id: locMap['Réfrigérateur'], category_id: catMap['Légumes'],           added_by: aliceId, name: 'Carottes',         quantity: 500, unit: 'g',     expires_at: inDays(10), expiry_source: 'manual', price: 0.90, is_shared: true, created_at: new Date(), updated_at: new Date() },
      { household_id: householdId, location_id: locMap['Réfrigérateur'], category_id: catMap['Produits laitiers'], added_by: bobId,   name: 'Œufs',             quantity: 6,   unit: 'unité', expires_at: inDays(20), expiry_source: 'manual', price: 2.40, is_shared: true, created_at: new Date(), updated_at: new Date() },
      { household_id: householdId, location_id: locMap['Réfrigérateur'], category_id: catMap['Produits laitiers'], added_by: aliceId, name: 'Beurre',           quantity: 250, unit: 'g',     expires_at: inDays(30), expiry_source: 'manual', price: 1.80, is_shared: true, created_at: new Date(), updated_at: new Date() },
      { household_id: householdId, location_id: locMap['Réfrigérateur'], category_id: catMap['Légumes'],           added_by: bobId,   name: 'Champignons',      quantity: 200, unit: 'g',     expires_at: inDays(4),  expiry_source: 'manual', price: 1.20, is_shared: true, created_at: new Date(), updated_at: new Date() },
      { household_id: householdId, location_id: locMap['Réfrigérateur'], category_id: catMap['Produits laitiers'], added_by: aliceId, name: 'Lait',             quantity: 1,   unit: 'L',     expires_at: inDays(7),  expiry_source: 'manual', price: 1.05, is_shared: true, created_at: new Date(), updated_at: new Date() },
      { household_id: householdId, location_id: locMap['Réfrigérateur'], category_id: catMap['Produits laitiers'], added_by: aliceId, name: 'Yaourts nature',   quantity: 4,   unit: 'unité', expires_at: inDays(12), expiry_source: 'manual', price: 1.60, is_shared: true, created_at: new Date(), updated_at: new Date() },
      // Congélateur
      { household_id: householdId, location_id: locMap['Congélateur'],   category_id: catMap['Viande'],            added_by: aliceId, name: 'Poulet',           quantity: 1,   unit: 'unité', expires_at: inDays(90), expiry_source: 'manual', price: 6.50, is_shared: true, created_at: new Date(), updated_at: new Date() },
      { household_id: householdId, location_id: locMap['Congélateur'],   category_id: catMap['Légumes'],           added_by: bobId,   name: 'Petits pois',      quantity: 500, unit: 'g',     expires_at: inDays(60), expiry_source: 'manual', price: 1.20, is_shared: true, created_at: new Date(), updated_at: new Date() },
      // Placard
      { household_id: householdId, location_id: locMap['Placard'],       category_id: catMap['Épicerie'],          added_by: aliceId, name: 'Pâtes',            quantity: 500, unit: 'g',     expires_at: inDays(365),expiry_source: 'manual', price: 1.10, is_shared: true, created_at: new Date(), updated_at: new Date() },
      { household_id: householdId, location_id: locMap['Placard'],       category_id: catMap['Épicerie'],          added_by: aliceId, name: 'Riz',              quantity: 1,   unit: 'kg',    expires_at: inDays(365),expiry_source: 'manual', price: 1.80, is_shared: true, created_at: new Date(), updated_at: new Date() },
      { household_id: householdId, location_id: locMap['Placard'],       category_id: catMap['Épicerie'],          added_by: bobId,   name: 'Farine',           quantity: 1,   unit: 'kg',    expires_at: inDays(180),expiry_source: 'manual', price: 0.90, is_shared: true, created_at: new Date(), updated_at: new Date() },
      // Placard épices
      { household_id: householdId, location_id: locMap['Placard épices'],category_id: catMap['Condiments'],        added_by: bobId,   name: 'Ail',              quantity: 1,   unit: 'tête',  expires_at: inDays(30), expiry_source: 'manual', price: 0.50, is_shared: true, created_at: new Date(), updated_at: new Date() },
      { household_id: householdId, location_id: locMap['Placard épices'],category_id: catMap['Condiments'],        added_by: aliceId, name: "Huile d'olive",    quantity: 1,   unit: 'L',     expires_at: inDays(365),expiry_source: 'manual', price: 4.50, is_shared: true, created_at: new Date(), updated_at: new Date() },
      { household_id: householdId, location_id: locMap['Placard épices'],category_id: catMap['Condiments'],        added_by: aliceId, name: 'Sel',              quantity: 500, unit: 'g',     expires_at: inDays(730),expiry_source: 'manual', price: 0.40, is_shared: true, created_at: new Date(), updated_at: new Date() },
    ]);

    // ─── RECIPES ──────────────────────────────────────────────────
    await queryInterface.bulkInsert('recipes', [
      {
        id: 'custom_001',
        source: 'custom',
        title: 'Ratatouille provençale',
        description: 'Un classique du sud de la France, savoureux et coloré.',
        image_url: 'https://images.unsplash.com/photo-1572453800999-e8d2d1589b7c?w=600',
        ready_in_minutes: 65,
        prep_time_minutes: 20,
        cook_time_minutes: 45,
        servings: 4,
        difficulty: 'facile',
        diet_tags: 'vegetarian,vegan',
        cuisine: 'française',
        is_custom: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'custom_002',
        source: 'custom',
        title: 'Omelette aux champignons',
        description: 'Rapide, protéinée et délicieuse.',
        image_url: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=600',
        ready_in_minutes: 15,
        prep_time_minutes: 5,
        cook_time_minutes: 10,
        servings: 2,
        difficulty: 'facile',
        diet_tags: 'vegetarian',
        cuisine: 'française',
        is_custom: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'custom_003',
        source: 'custom',
        title: 'Pasta al pomodoro',
        description: 'La simplicité italienne à son meilleur.',
        image_url: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600',
        ready_in_minutes: 25,
        prep_time_minutes: 5,
        cook_time_minutes: 20,
        servings: 4,
        difficulty: 'facile',
        diet_tags: 'vegetarian',
        cuisine: 'italienne',
        is_custom: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'custom_004',
        source: 'custom',
        title: 'Poulet rôti aux herbes',
        description: 'Le classique du dimanche, croustillant et parfumé.',
        image_url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c7?w=600',
        ready_in_minutes: 100,
        prep_time_minutes: 10,
        cook_time_minutes: 90,
        servings: 4,
        difficulty: 'moyen',
        diet_tags: '',
        cuisine: 'française',
        is_custom: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    // ─── RECIPE INGREDIENTS ───────────────────────────────────────
    await queryInterface.bulkInsert('recipe_ingredients', [
      // Ratatouille
      { recipe_id: 'custom_001', name: 'Courgette',    amount: 2,   unit: 'unité',  category_id: catMap['Légumes'],   is_optional: false, display_order: 1 },
      { recipe_id: 'custom_001', name: 'Aubergine',    amount: 1,   unit: 'unité',  category_id: catMap['Légumes'],   is_optional: false, display_order: 2 },
      { recipe_id: 'custom_001', name: 'Tomate',       amount: 3,   unit: 'unité',  category_id: catMap['Légumes'],   is_optional: false, display_order: 3 },
      { recipe_id: 'custom_001', name: 'Oignon',       amount: 1,   unit: 'unité',  category_id: catMap['Légumes'],   is_optional: false, display_order: 4 },
      { recipe_id: 'custom_001', name: 'Ail',          amount: 2,   unit: 'gousse', category_id: catMap['Condiments'],is_optional: false, display_order: 5 },
      { recipe_id: 'custom_001', name: "Huile d'olive",amount: 3,   unit: 'c.à.s',  category_id: catMap['Condiments'],is_optional: false, display_order: 6 },
      // Omelette
      { recipe_id: 'custom_002', name: 'Œufs',         amount: 4,   unit: 'unité',  category_id: catMap['Produits laitiers'], is_optional: false, display_order: 1 },
      { recipe_id: 'custom_002', name: 'Champignons',  amount: 150, unit: 'g',      category_id: catMap['Légumes'],   is_optional: false, display_order: 2 },
      { recipe_id: 'custom_002', name: 'Beurre',       amount: 20,  unit: 'g',      category_id: catMap['Produits laitiers'], is_optional: false, display_order: 3 },
      // Pasta
      { recipe_id: 'custom_003', name: 'Pâtes',        amount: 400, unit: 'g',      category_id: catMap['Épicerie'],  is_optional: false, display_order: 1 },
      { recipe_id: 'custom_003', name: 'Tomate',       amount: 400, unit: 'g',      category_id: catMap['Légumes'],   is_optional: false, display_order: 2 },
      { recipe_id: 'custom_003', name: 'Ail',          amount: 2,   unit: 'gousse', category_id: catMap['Condiments'],is_optional: false, display_order: 3 },
      { recipe_id: 'custom_003', name: "Huile d'olive",amount: 3,   unit: 'c.à.s',  category_id: catMap['Condiments'],is_optional: false, display_order: 4 },
      // Poulet
      { recipe_id: 'custom_004', name: 'Poulet',       amount: 1,   unit: 'unité',  category_id: catMap['Viande'],    is_optional: false, display_order: 1 },
      { recipe_id: 'custom_004', name: 'Beurre',       amount: 50,  unit: 'g',      category_id: catMap['Produits laitiers'], is_optional: false, display_order: 2 },
      { recipe_id: 'custom_004', name: 'Ail',          amount: 4,   unit: 'gousse', category_id: catMap['Condiments'],is_optional: false, display_order: 3 },
    ]);

    // ─── RECIPE STEPS ─────────────────────────────────────────────
    await queryInterface.bulkInsert('recipe_steps', [
      { recipe_id: 'custom_001', step_number: 1, title: 'Préparer les légumes',  description: 'Couper tous les légumes en rondelles de 5mm.' },
      { recipe_id: 'custom_001', step_number: 2, title: 'Faire la base',         description: "Faire revenir l'oignon et l'ail dans l'huile d'olive 5 min." },
      { recipe_id: 'custom_001', step_number: 3, title: 'Ajouter les tomates',   description: 'Ajouter les tomates concassées et laisser mijoter 10 min.' },
      { recipe_id: 'custom_001', step_number: 4, title: 'Enfourner',             description: 'Disposer les légumes en couches dans un plat, enfourner à 180°C pendant 45 min.', duration_minutes: 45 },
      { recipe_id: 'custom_002', step_number: 1, title: 'Battre les œufs',       description: 'Battre les œufs en omelette avec sel et poivre.' },
      { recipe_id: 'custom_002', step_number: 2, title: 'Cuire les champignons', description: 'Faire revenir les champignons émincés au beurre.', duration_minutes: 5 },
      { recipe_id: 'custom_002', step_number: 3, title: 'Cuire l\'omelette',     description: 'Verser les œufs dans la poêle chaude, garnir avec les champignons et plier.', duration_minutes: 3 },
      { recipe_id: 'custom_003', step_number: 1, title: 'Cuire les pâtes',       description: 'Cuire les pâtes al dente dans l\'eau bouillante salée.', duration_minutes: 10 },
      { recipe_id: 'custom_003', step_number: 2, title: 'Préparer la sauce',     description: "Faire revenir l'ail dans l'huile, ajouter les tomates et laisser mijoter 15 min.", duration_minutes: 15 },
      { recipe_id: 'custom_003', step_number: 3, title: 'Mélanger',              description: 'Mélanger les pâtes égouttées avec la sauce. Servir avec du basilic.' },
      { recipe_id: 'custom_004', step_number: 1, title: 'Préchauffer le four',   description: 'Préchauffer le four à 200°C.' },
      { recipe_id: 'custom_004', step_number: 2, title: 'Préparer le poulet',    description: 'Badigeonner le poulet de beurre, sel, poivre et herbes.' },
      { recipe_id: 'custom_004', step_number: 3, title: 'Rôtir',                 description: 'Enfourner 1h30 en arrosant toutes les 20 minutes.', duration_minutes: 90 },
    ]);

    // ─── SHOPPING LIST ────────────────────────────────────────────
    await queryInterface.bulkInsert('shopping_lists', [
      {
        household_id: householdId,
        name: 'Courses de la semaine',
        is_default: true,
        display_order: 0,
        created_by: aliceId,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    const lists = await queryInterface.sequelize.query(
      'SELECT id FROM shopping_lists ORDER BY id ASC',
      { type: Sequelize.QueryTypes.SELECT }
    );
    const listId = lists[0].id;

    await queryInterface.bulkInsert('shopping_items', [
      { list_id: listId, name: 'Courgettes',  quantity: 2, unit: 'unité', category_id: catMap['Légumes'],  checked: false, added_by: aliceId, display_order: 0, created_at: new Date() },
      { list_id: listId, name: 'Mozzarella',  quantity: 1, unit: 'unité', category_id: catMap['Produits laitiers'], checked: false, added_by: bobId,   display_order: 1, created_at: new Date() },
      { list_id: listId, name: 'Jus d\'orange',quantity: 1, unit: 'L',    category_id: catMap['Boissons'], checked: false, added_by: aliceId, display_order: 2, created_at: new Date() },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('shopping_items',         null, {});
    await queryInterface.bulkDelete('shopping_lists',         null, {});
    await queryInterface.bulkDelete('recipe_steps',           null, {});
    await queryInterface.bulkDelete('recipe_ingredients',     null, {});
    await queryInterface.bulkDelete('recipes',                null, {});
    await queryInterface.bulkDelete('products',               null, {});
    await queryInterface.bulkDelete('locations',              null, {});
    await queryInterface.bulkDelete('product_categories',     null, {});
    await queryInterface.bulkDelete('household_members',      null, {});
    await queryInterface.bulkDelete('notif_settings',         null, {});
    await queryInterface.bulkDelete('households',             null, {});
    await queryInterface.bulkDelete('users',                  null, {});
  },
};