const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const productRoutes = require('./product.routes');
const locationRoutes = require('./location.routes');
const categoryRoutes = require('./category.routes');
const householdRoutes = require('./household.routes');
const shoppingRoutes = require('./shopping.routes');
const recipeRoutes = require('./recipe.routes');

// Routes publiques
router.use('/auth', authRoutes);

// Routes protégées
router.use('/products', productRoutes);
router.use('/locations', locationRoutes);
router.use('/categories', categoryRoutes);
router.use('/households', householdRoutes);
router.use('/shopping-lists', shoppingRoutes);
router.use('/recipes', recipeRoutes);

// Route de santé
router.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'MySmartFridge API is running 🧊' });
});

module.exports = router;
