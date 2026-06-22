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

// POST /api/auth/forgot-password - demander un lien de réinitialisation
router.post('/forgot-password', authController.forgotPassword);

// GET /api/auth/reset-password/:token - vérifier la validité d'un token
router.get('/reset-password/:token', authController.verifyResetToken);

// POST /api/auth/reset-password - définir un nouveau mot de passe via token
router.post('/reset-password', authController.resetPassword);

module.exports = router;
