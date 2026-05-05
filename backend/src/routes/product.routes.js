const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const householdMiddleware = require('../middlewares/household.middleware');

// Toutes les routes sont protégées
router.use(authMiddleware);
router.use(householdMiddleware);

// GET /api/products - Liste des produits de l'utilisateur
router.get('/', productController.getAll);

// GET /api/products/expiring - Produits bientôt périmés
router.get('/expiring', productController.getExpiring);

// GET /api/products/:id - Détail d'un produit
router.get('/:id', productController.getOne);

// POST /api/products - Créer un produit
router.post('/', productController.create);

// PUT /api/products/:id - Modifier un produit
router.put('/:id', productController.update);

// DELETE /api/products/:id - Supprimer un produit
router.delete('/:id', productController.delete);

module.exports = router;
