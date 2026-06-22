const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// GET /api/auth/me (protégé)
router.get('/me', authMiddleware, authController.me);

// PUT /api/auth/profile (protégé) - modifier ses infos
router.put('/profile', authMiddleware, authController.updateProfile);

// PUT /api/auth/password (protégé) - changer son mot de passe
router.put('/password', authMiddleware, authController.changePassword);

module.exports = router;
