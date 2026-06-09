const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipe.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const householdMiddleware = require('../middlewares/household.middleware');

router.use(authMiddleware);
router.use(householdMiddleware);

// Routes statiques (avant /:id)
router.get('/suggestions', recipeController.getSuggestions);
router.get('/history', recipeController.getHistory);

// Liste & détail
router.get('/', recipeController.getAll);
router.get('/:id', recipeController.getOne);

// Favoris
router.post('/:id/favorite', recipeController.addFavorite);
router.delete('/:id/favorite', recipeController.removeFavorite);

// Marquer comme cuisinée (décrémente le stock)
router.post('/:id/cook', recipeController.cook);

module.exports = router;
