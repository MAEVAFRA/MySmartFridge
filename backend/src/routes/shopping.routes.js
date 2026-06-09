const express = require('express');
const router = express.Router();
const shoppingController = require('../controllers/shopping.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const householdMiddleware = require('../middlewares/household.middleware');

router.use(authMiddleware);
router.use(householdMiddleware);

// Listes
router.get('/', shoppingController.getAll);
router.post('/', shoppingController.create);
router.put('/:id', shoppingController.update);
router.delete('/:id', shoppingController.delete);

// Articles d'une liste
router.post('/:id/items', shoppingController.addItem);
router.post('/:id/items/from-inventory', shoppingController.addItemsFromInventory);
router.put('/:id/items/:itemId', shoppingController.updateItem);
router.delete('/:id/items/:itemId', shoppingController.deleteItem);

// Transfert des articles cochés vers le stock
router.post('/:id/transfer', shoppingController.transferToStock);

module.exports = router;
