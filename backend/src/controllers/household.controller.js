const crypto = require('crypto');
const {
  Household,
  HouseholdMember,
  HouseholdInvitation,
  User,
  Location,
  NotifSettings,
} = require('../models');

// ─── Helpers ──────────────────────────────────────────────────────

const INVITE_EXPIRY_DAYS = 7;

const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const getMemberRole = async (userId, householdId) => {
  const member = await HouseholdMember.findOne({
    where: { user_id: userId, household_id: householdId },
  });
  return member ? member.role : null;
};

const canManageMembers = (role) => {
  return role === 'owner' || role === 'admin';
};

const canEditHousehold = (role) => {
  return role === 'owner' || role === 'admin';
};

// ─── GET /api/households ──────────────────────────────────────────

exports.getMyHouseholds = async (req, res) => {
  try {
    const memberships = await HouseholdMember.findAll({
      where: { user_id: req.user.id },
      include: [
        {
          model: Household,
          where: { deleted_at: null },
          required: true,
        },
      ],
      order: [['joined_at', 'ASC']],
    });

    const households = memberships.map((m) => ({
      id: m.Household.id,
      name: m.Household.name,
      avatar_url: m.Household.avatar_url,
      currency: m.Household.currency,
      monthly_budget: m.Household.monthly_budget,
      role: m.role,
      color: m.color,
      joined_at: m.joined_at,
    }));

    res.json(households);
  } catch (error) {
    console.error('Erreur getMyHouseholds:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ─── GET /api/households/:id ──────────────────────────────────────

exports.getOne = async (req, res) => {
  try {
    const householdId = req.params.id;

    // Vérifier que l'utilisateur est membre
    const myMembership = await HouseholdMember.findOne({
      where: { user_id: req.user.id, household_id: householdId },
    });

    if (!myMembership) {
      return res.status(403).json({ message: 'Vous n\'êtes pas membre de ce foyer' });
    }

    const household = await Household.findByPk(householdId, {
      where: { deleted_at: null },
      include: [
        {
          model: HouseholdMember,
          as: 'members',
          include: [
            {
              model: User,
              attributes: ['id', 'name', 'email', 'avatar_url'],
            },
          ],
        },
        {
          model: HouseholdInvitation,
          as: 'invitations',
          where: { accepted_at: null, declined_at: null },
          required: false,
          include: [
            {
              model: User,
              as: 'invitedBy',
              attributes: ['id', 'name'],
            },
          ],
        },
        {
          model: Location,
          as: 'locations',
          where: { deleted_at: null },
          required: false,
        },
      ],
    });

    if (!household) {
      return res.status(404).json({ message: 'Foyer non trouvé' });
    }

    res.json({
      id: household.id,
      name: household.name,
      avatar_url: household.avatar_url,
      invite_token: household.invite_token,
      invite_token_expires_at: household.invite_token_expires_at,
      currency: household.currency,
      monthly_budget: household.monthly_budget,
      my_role: myMembership.role,
      members: household.members.map((m) => ({
        id: m.User.id,
        name: m.User.name,
        email: m.User.email,
        avatar_url: m.User.avatar_url,
        role: m.role,
        color: m.color,
        nickname: m.nickname,
        joined_at: m.joined_at,
      })),
      pending_invitations: (household.invitations || []).map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        token: inv.token,
        expires_at: inv.expires_at,
        invited_by: inv.invitedBy ? { id: inv.invitedBy.id, name: inv.invitedBy.name } : null,
        created_at: inv.created_at,
      })),
      locations: household.locations || [],
    });
  } catch (error) {
    console.error('Erreur getOne household:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ─── POST /api/households ─────────────────────────────────────────

exports.create = async (req, res) => {
  try {
    const { name, currency = 'EUR', monthly_budget } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Le nom du foyer est requis' });
    }

    const household = await Household.create({
      name,
      invite_token: generateToken().substring(0, 8).toUpperCase(),
      invite_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      currency,
      monthly_budget: monthly_budget || null,
      created_by: req.user.id,
    });

    await HouseholdMember.create({
      user_id: req.user.id,
      household_id: household.id,
      role: 'owner',
      color: '#6366f1',
    });

    // Créer les locations par défaut
    await Location.bulkCreate([
      { household_id: household.id, name: 'Réfrigérateur', type: 'fridge', icon: '🧊', color: '#3b82f6', display_order: 0, is_default: true },
      { household_id: household.id, name: 'Congélateur', type: 'freezer', icon: '❄️', color: '#06b6d4', display_order: 1, is_default: false },
      { household_id: household.id, name: 'Placard', type: 'pantry', icon: '🗄️', color: '#8b5cf6', display_order: 2, is_default: false },
    ]);

    res.status(201).json({
      message: 'Foyer créé avec succès',
      household: {
        id: household.id,
        name: household.name,
        invite_token: household.invite_token,
        currency: household.currency,
        role: 'owner',
      },
    });
  } catch (error) {
    console.error('Erreur create household:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ─── PUT /api/households/:id ──────────────────────────────────────

exports.update = async (req, res) => {
  try {
    const householdId = req.params.id;
    const { name, currency, monthly_budget } = req.body;

    const role = await getMemberRole(req.user.id, householdId);

    if (!canEditHousehold(role)) {
      return res.status(403).json({ message: 'Vous n\'avez pas les droits pour modifier ce foyer' });
    }

    const household = await Household.findOne({
      where: { id: householdId, deleted_at: null },
    });

    if (!household) {
      return res.status(404).json({ message: 'Foyer non trouvé' });
    }

    await household.update({ name, currency, monthly_budget });

    res.json({
      message: 'Foyer mis à jour',
      household: {
        id: household.id,
        name: household.name,
        currency: household.currency,
        monthly_budget: household.monthly_budget,
      },
    });
  } catch (error) {
    console.error('Erreur update household:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ─── POST /api/households/:id/invite ──────────────────────────────

exports.inviteByEmail = async (req, res) => {
  try {
    const householdId = req.params.id;
    const { email, role = 'member' } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'L\'email est requis' });
    }

    const myRole = await getMemberRole(req.user.id, householdId);

    if (!canManageMembers(myRole)) {
      return res.status(403).json({ message: 'Vous n\'avez pas les droits pour inviter des membres' });
    }

    // Vérifier si l'invitation existe déjà
    const existing = await HouseholdInvitation.findOne({
      where: { household_id: householdId, email, accepted_at: null, declined_at: null },
    });

    if (existing) {
      return res.status(400).json({ message: 'Une invitation est déjà en attente pour cet email' });
    }

    // Vérifier si l'email est déjà membre
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      const alreadyMember = await HouseholdMember.findOne({
        where: { user_id: existingUser.id, household_id: householdId },
      });
      if (alreadyMember) {
        return res.status(400).json({ message: 'Cet utilisateur est déjà membre du foyer' });
      }
    }

    const invitation = await HouseholdInvitation.create({
      household_id: householdId,
      invited_by: req.user.id,
      email,
      role,
      token: generateToken(),
      expires_at: new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    });

    res.status(201).json({
      message: 'Invitation créée avec succès',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        token: invitation.token,
        expires_at: invitation.expires_at,
      },
    });
  } catch (error) {
    console.error('Erreur inviteByEmail:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ─── POST /api/households/invite/accept ───────────────────────────

exports.acceptInvitation = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Le token d\'invitation est requis' });
    }

    const invitation = await HouseholdInvitation.findOne({
      where: { token, accepted_at: null, declined_at: null },
    });

    if (!invitation) {
      return res.status(404).json({ message: 'Invitation introuvable ou déjà traitée' });
    }

    if (new Date() > new Date(invitation.expires_at)) {
      return res.status(410).json({ message: 'Cette invitation a expiré' });
    }

    // Vérifier que l'email de l'invitation correspond à l'utilisateur connecté
    if (invitation.email.toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(403).json({ message: 'Cette invitation ne vous est pas destinée' });
    }

    // Vérifier si l'utilisateur est déjà membre
    const alreadyMember = await HouseholdMember.findOne({
      where: { user_id: req.user.id, household_id: invitation.household_id },
    });

    if (alreadyMember) {
      return res.status(400).json({ message: 'Vous êtes déjà membre de ce foyer' });
    }

    // Créer le membre
    await HouseholdMember.create({
      user_id: req.user.id,
      household_id: invitation.household_id,
      role: invitation.role,
      color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
    });

    // Créer les paramètres de notifications si pas existants
    const existingNotif = await NotifSettings.findOne({ where: { user_id: req.user.id } });
    if (!existingNotif) {
      await NotifSettings.create({ user_id: req.user.id });
    }

    // Marquer l'invitation comme acceptée
    await invitation.update({ accepted_at: new Date() });

    res.json({ message: 'Vous avez rejoint le foyer avec succès' });
  } catch (error) {
    console.error('Erreur acceptInvitation:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ─── POST /api/households/invite/decline ──────────────────────────

exports.declineInvitation = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Le token d\'invitation est requis' });
    }

    const invitation = await HouseholdInvitation.findOne({
      where: { token, accepted_at: null, declined_at: null },
    });

    if (!invitation) {
      return res.status(404).json({ message: 'Invitation introuvable ou déjà traitée' });
    }

    if (invitation.email.toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(403).json({ message: 'Cette invitation ne vous est pas destinée' });
    }

    await invitation.update({ declined_at: new Date() });

    res.json({ message: 'Invitation refusée' });
  } catch (error) {
    console.error('Erreur declineInvitation:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ─── DELETE /api/households/:id/members/:userId ───────────────────

exports.removeMember = async (req, res) => {
  try {
    const householdId = req.params.id;
    const targetUserId = req.params.userId;

    const myRole = await getMemberRole(req.user.id, householdId);

    if (!canManageMembers(myRole)) {
      return res.status(403).json({ message: 'Vous n\'avez pas les droits pour retirer un membre' });
    }

    // Empêcher un admin de retirer un owner
    const targetMember = await HouseholdMember.findOne({
      where: { user_id: targetUserId, household_id: householdId },
    });

    if (!targetMember) {
      return res.status(404).json({ message: 'Membre non trouvé' });
    }

    if (targetMember.role === 'owner' && myRole !== 'owner') {
      return res.status(403).json({ message: 'Seul le propriétaire peut être retiré par un autre propriétaire' });
    }

    // Un owner ne peut pas se retirer lui-même s'il est le dernier
    if (targetUserId == req.user.id && targetMember.role === 'owner') {
      const ownerCount = await HouseholdMember.count({
        where: { household_id: householdId, role: 'owner' },
      });
      if (ownerCount <= 1) {
        return res.status(400).json({ message: 'Vous ne pouvez pas quitter le foyer en étant le dernier propriétaire' });
      }
    }

    await targetMember.destroy();

    res.json({ message: 'Membre retiré avec succès' });
  } catch (error) {
    console.error('Erreur removeMember:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ─── POST /api/households/:id/leave ───────────────────────────────

exports.leaveHousehold = async (req, res) => {
  try {
    const householdId = req.params.id;

    const member = await HouseholdMember.findOne({
      where: { user_id: req.user.id, household_id: householdId },
    });

    if (!member) {
      return res.status(404).json({ message: 'Vous n\'êtes pas membre de ce foyer' });
    }

    if (member.role === 'owner') {
      const ownerCount = await HouseholdMember.count({
        where: { household_id: householdId, role: 'owner' },
      });
      if (ownerCount <= 1) {
        return res.status(400).json({ message: 'Vous ne pouvez pas quitter le foyer en étant le dernier propriétaire' });
      }
    }

    await member.destroy();

    res.json({ message: 'Vous avez quitté le foyer' });
  } catch (error) {
    console.error('Erreur leaveHousehold:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ─── GET /api/households/invitations/pending ──────────────────────

exports.getPendingInvitations = async (req, res) => {
  try {
    const invitations = await HouseholdInvitation.findAll({
      where: {
        email: req.user.email,
        accepted_at: null,
        declined_at: null,
        expires_at: { [require('sequelize').Op.gte]: new Date() },
      },
      include: [
        {
          model: Household,
          attributes: ['id', 'name', 'avatar_url'],
        },
        {
          model: User,
          as: 'invitedBy',
          attributes: ['id', 'name'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    res.json(
      invitations.map((inv) => ({
        id: inv.id,
        token: inv.token,
        role: inv.role,
        expires_at: inv.expires_at,
        created_at: inv.created_at,
        household: inv.Household,
        invited_by: inv.invitedBy,
      }))
    );
  } catch (error) {
    console.error('Erreur getPendingInvitations:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ─── POST /api/households/:id/refresh-token ───────────────────────

exports.refreshInviteToken = async (req, res) => {
  try {
    const householdId = req.params.id;

    const role = await getMemberRole(req.user.id, householdId);

    if (!canManageMembers(role)) {
      return res.status(403).json({ message: 'Vous n\'avez pas les droits pour cette action' });
    }

    const household = await Household.findOne({
      where: { id: householdId, deleted_at: null },
    });

    if (!household) {
      return res.status(404).json({ message: 'Foyer non trouvé' });
    }

    const newToken = generateToken().substring(0, 8).toUpperCase();
    await household.update({
      invite_token: newToken,
      invite_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    res.json({
      message: 'Lien d\'invitation régénéré',
      invite_token: newToken,
      invite_token_expires_at: household.invite_token_expires_at,
    });
  } catch (error) {
    console.error('Erreur refreshInviteToken:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
