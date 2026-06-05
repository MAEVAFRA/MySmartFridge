const express = require('express');
const router = express.Router();
const locationController = require('../controllers/location.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const householdMiddleware = require('../middlewares/household.middleware');

router.use(authMiddleware);
router.use(householdMiddleware);

// GET /api/locations - Liste des emplacements
router.get('/', locationController.getAll);

// GET /api/locations/:id - Détail avec produits
router.get('/:id', locationController.getOne);

// POST /api/locations - Créer un emplacement
router.post('/', locationController.create);

// PUT /api/locations/:id - Modifier un emplacement
router.put('/:id', locationController.update);

// DELETE /api/locations/:id - Supprimer un emplacement
router.delete('/:id', locationController.delete);

module.exports = router;
