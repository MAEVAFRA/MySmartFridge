const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const productRoutes = require('./product.routes');
const locationRoutes = require('./location.routes');
const categoryRoutes = require('./category.routes');
const householdRoutes = require('./household.routes');
const shoppingRoutes = require('./shopping.routes');
const recipeRoutes = require('./recipe.routes');
const historyRoutes = require('./history.routes');
const statsRoutes = require('./stats.routes');
const expenseRoutes = require('./expense.routes');
const budgetRoutes = require('./budget.routes');
const receiptRoutes = require('./receipt.routes');

// Routes publiques
router.use('/auth', authRoutes);

// Routes protégées
router.use('/products', productRoutes);
router.use('/locations', locationRoutes);
router.use('/categories', categoryRoutes);
router.use('/households', householdRoutes);
router.use('/shopping-lists', shoppingRoutes);
router.use('/recipes', recipeRoutes);
router.use('/history', historyRoutes);
router.use('/stats', statsRoutes);
router.use('/expenses', expenseRoutes);
router.use('/budgets', budgetRoutes);
router.use('/receipts', receiptRoutes);

// Route de santé
router.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'MySmartFridge API is running 🧊' });
});

module.exports = router;