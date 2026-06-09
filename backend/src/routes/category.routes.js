const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const householdMiddleware = require('../middlewares/household.middleware');

router.use(authMiddleware);
router.use(householdMiddleware);

// GET /api/categories - Liste des catégories (globale, pas filtrée par foyer)
router.get('/', categoryController.getAll);

// GET /api/categories/:id - Détail avec produits
router.get('/:id', categoryController.getOne);

// PUT /api/categories/:id - Configurer les durées de conservation
router.put('/:id', categoryController.update);

module.exports = router;
