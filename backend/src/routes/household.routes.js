const express = require('express');
const router = express.Router();
const householdController = require('../controllers/household.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

// GET /api/households - Liste des foyers de l'utilisateur
router.get('/', householdController.getMyHouseholds);

// GET /api/households/invitations/pending - Invitations reçues
router.get('/invitations/pending', householdController.getPendingInvitations);

// POST /api/households - Créer un foyer
router.post('/', householdController.create);

// GET /api/households/:id - Détail d'un foyer
router.get('/:id', householdController.getOne);

// PUT /api/households/:id - Modifier un foyer
router.put('/:id', householdController.update);

// POST /api/households/:id/invite - Inviter par email
router.post('/:id/invite', householdController.inviteByEmail);

// POST /api/households/invite/accept - Accepter une invitation
router.post('/invite/accept', householdController.acceptInvitation);

// POST /api/households/invite/decline - Refuser une invitation
router.post('/invite/decline', householdController.declineInvitation);

// DELETE /api/households/:id/members/:userId - Retirer un membre
router.delete('/:id/members/:userId', householdController.removeMember);

// POST /api/households/:id/leave - Quitter un foyer
router.post('/:id/leave', householdController.leaveHousehold);

// POST /api/households/:id/refresh-token - Régénérer le token d'invitation
router.post('/:id/refresh-token', householdController.refreshInviteToken);

module.exports = router;
