const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const householdMiddleware = require('../middlewares/household.middleware');

router.use(authMiddleware);
router.use(householdMiddleware);

// GET /api/categories - Liste des catégories (globale, pas filtrée par foyer)
router.get('/', categoryController.getAll);

// POST /api/categories - Créer une catégorie personnalisée
router.post('/', categoryController.create);

// GET /api/categories/:id - Détail avec produits
router.get('/:id', categoryController.getOne);

// PUT /api/categories/:id - Configurer les durées de conservation
router.put('/:id', categoryController.update);

// DELETE /api/categories/:id - Supprimer une catégorie personnalisée
router.delete('/:id', categoryController.delete);

module.exports = router;
