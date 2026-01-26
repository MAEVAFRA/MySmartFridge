const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

// GET /api/categories - Liste des catégories
router.get('/', categoryController.getAll);

// GET /api/categories/:id - Détail avec produits
router.get('/:id', categoryController.getOne);

module.exports = router;
