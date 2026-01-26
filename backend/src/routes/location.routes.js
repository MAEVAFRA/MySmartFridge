const express = require('express');
const router = express.Router();
const locationController = require('../controllers/location.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

// GET /api/locations - Liste des emplacements
router.get('/', locationController.getAll);

// GET /api/locations/:id - Détail avec produits
router.get('/:id', locationController.getOne);

module.exports = router;
