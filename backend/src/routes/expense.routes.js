const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expense.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const householdMiddleware = require('../middlewares/household.middleware');

router.use(authMiddleware);
router.use(householdMiddleware);

// GET /api/expenses - Liste des dépenses (filtres de période : from, to)
router.get('/', expenseController.getAll);

// GET /api/expenses/balances - Qui doit quoi à qui (façon Tricount)
router.get('/balances', expenseController.getBalances);

// GET /api/expenses/audit-log - Historique des suppressions et règlements (anti-fraude)
router.get('/audit-log', expenseController.getAuditLog);

// POST /api/expenses/settle - Marquer une relation comme réglée
router.post('/settle', expenseController.settleBetween);

// POST /api/expenses - Enregistrer une dépense
router.post('/', expenseController.create);

// PUT /api/expenses/:id - Modifier une dépense
router.put('/:id', expenseController.update);

// DELETE /api/expenses/:id - Supprimer une dépense
router.delete('/:id', expenseController.delete);

module.exports = router;