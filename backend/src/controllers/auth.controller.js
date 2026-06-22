const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User, Household, HouseholdMember, Location, ProductCategory, NotifSettings, PasswordReset } = require('../models');
const { sendPasswordResetEmail } = require('../utils/mailer');

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 heure

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const getUserHouseholds = async (userId) => {
  const memberships = await HouseholdMember.findAll({
    where: { user_id: userId },
    include: [
      {
        model: Household,
        where: { deleted_at: null },
        required: true,
      },
    ],
    order: [['joined_at', 'ASC']],
  });

  return memberships.map((m) => ({
    id: m.Household.id,
    name: m.Household.name,
    role: m.role,
  }));
};

exports.register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Nom, email et mot de passe requis' });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    // Hasher le mot de passe
    const password_hash = await bcrypt.hash(password, 12);

    // Créer l'utilisateur
    const user = await User.create({ name, email, password_hash });

    // Créer un household par défaut
    const household = await Household.create({
      name: `Frigo de ${name}`,
      invite_token: Math.random().toString(36).substring(2, 10).toUpperCase(),
      invite_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      currency: 'EUR',
      created_by: user.id,
    });

    // Ajouter l'utilisateur comme owner
    await HouseholdMember.create({
      user_id: user.id,
      household_id: household.id,
      role: 'owner',
      color: '#6366f1',
    });

    // Créer les locations par défaut
    await Location.bulkCreate([
      { household_id: household.id, name: 'Réfrigérateur', type: 'fridge',  icon: '🧊', color: '#3b82f6', display_order: 0, is_default: true },
      { household_id: household.id, name: 'Congélateur',   type: 'freezer', icon: '❄️', color: '#06b6d4', display_order: 1, is_default: false },
      { household_id: household.id, name: 'Placard',       type: 'pantry',  icon: '🗄️', color: '#8b5cf6', display_order: 2, is_default: false },
    ]);

    // Créer les paramètres de notifications par défaut
    await NotifSettings.create({ user_id: user.id });

    const token = generateToken(user);
    const households = await getUserHouseholds(user.id);

    res.status(201).json({
      message: 'Inscription réussie',
      user: { id: user.id, name: user.name, email: user.email, households },
      token,
    });
  } catch (error) {
    console.error('Erreur register:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Vérifier le mot de passe
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Mettre à jour last_login_at
    await user.update({ last_login_at: new Date() });

    const token = generateToken(user);
    const households = await getUserHouseholds(user.id);

    res.json({
      message: 'Connexion réussie',
      user: { id: user.id, name: user.name, email: user.email, households },
      token,
    });
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash'] },
    });
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });

    const households = await getUserHouseholds(user.id);
    res.json({ user: { ...user.toJSON(), households } });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, avatar_url, dietary_preferences, allergies } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });

    const updates = {};

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ message: 'Le nom ne peut pas être vide' });
      updates.name = name.trim();
    }

    if (email !== undefined) {
      const normalized = email.trim().toLowerCase();
      if (!normalized) return res.status(400).json({ message: 'L\'email ne peut pas être vide' });
      if (normalized !== user.email.toLowerCase()) {
        const existing = await User.findOne({ where: { email: normalized } });
        if (existing) return res.status(400).json({ message: 'Cet email est déjà utilisé' });
      }
      updates.email = normalized;
    }

    if (avatar_url !== undefined)          updates.avatar_url = avatar_url || null;
    if (dietary_preferences !== undefined) updates.dietary_preferences = dietary_preferences || null;
    if (allergies !== undefined)           updates.allergies = allergies || null;

    await user.update(updates);

    const households = await getUserHouseholds(user.id);
    const json = user.toJSON();
    delete json.password_hash;

    res.json({ message: 'Profil mis à jour', user: { ...json, households } });
  } catch (error) {
    console.error('Erreur updateProfile:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// PUT /api/auth/password
exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ message: 'Mot de passe actuel et nouveau mot de passe requis' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ message: 'Le nouveau mot de passe doit faire au moins 6 caractères' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });

    const isValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
    }

    const password_hash = await bcrypt.hash(new_password, 12);
    await user.update({ password_hash });

    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    console.error('Erreur changePassword:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST /api/auth/forgot-password - Demander un lien de réinitialisation
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'L\'email est requis' });
    }

    const normalized = email.trim().toLowerCase();
    const user = await User.findOne({ where: { email: normalized } });

    // Réponse générique : on ne révèle jamais si l'email existe (anti-énumération)
    const genericResponse = {
      message: 'Si un compte est associé à cet email, un lien de réinitialisation vient d\'être envoyé.',
    };

    if (!user) {
      return res.json(genericResponse);
    }

    // Invalider les éventuelles demandes précédentes non utilisées
    await PasswordReset.destroy({ where: { user_id: user.id, used_at: null } });

    const token = crypto.randomBytes(32).toString('hex');
    await PasswordReset.create({
      user_id: user.id,
      token,
      expires_at: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await sendPasswordResetEmail(user.email, resetUrl);

    // En dev (pas de vrai SMTP), on renvoie le lien pour pouvoir tester le flux
    if (process.env.NODE_ENV !== 'production') {
      return res.json({ ...genericResponse, dev_reset_url: resetUrl });
    }

    res.json(genericResponse);
  } catch (error) {
    console.error('Erreur forgotPassword:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET /api/auth/reset-password/:token - Vérifier la validité d'un token
exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    const reset = await PasswordReset.findOne({ where: { token, used_at: null } });

    if (!reset || new Date() > new Date(reset.expires_at)) {
      return res.status(400).json({ valid: false, message: 'Lien invalide ou expiré' });
    }

    res.json({ valid: true });
  } catch (error) {
    console.error('Erreur verifyResetToken:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST /api/auth/reset-password - Définir un nouveau mot de passe via token
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token et nouveau mot de passe requis' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Le mot de passe doit faire au moins 6 caractères' });
    }

    const reset = await PasswordReset.findOne({ where: { token, used_at: null } });
    if (!reset || new Date() > new Date(reset.expires_at)) {
      return res.status(400).json({ message: 'Lien invalide ou expiré' });
    }

    const user = await User.findByPk(reset.user_id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    await user.update({ password_hash });
    await reset.update({ used_at: new Date() });

    res.json({ message: 'Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter.' });
  } catch (error) {
    console.error('Erreur resetPassword:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};