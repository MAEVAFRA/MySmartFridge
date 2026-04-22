const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Household, HouseholdMember, Location, ProductCategory, NotifSettings } = require('../models');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
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

    res.status(201).json({
      message: 'Inscription réussie',
      user: { id: user.id, name: user.name, email: user.email },
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

    res.json({
      message: 'Connexion réussie',
      user: { id: user.id, name: user.name, email: user.email },
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
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};