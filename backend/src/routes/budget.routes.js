const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budget.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const householdMiddleware = require('../middlewares/household.middleware');

router.use(authMiddleware);
router.use(householdMiddleware);

// GET /api/budgets - Résumé des budgets par catégorie (dépensé vs limite)
router.get('/', budgetController.getSummary);

// POST /api/budgets - Définir / mettre à jour le budget d'une catégorie
router.post('/', budgetController.upsert);

// DELETE /api/budgets/:id - Supprimer un budget
router.delete('/:id', budgetController.remove);

module.exports = router;
