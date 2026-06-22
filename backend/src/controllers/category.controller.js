const { Op } = require('sequelize');
const { ProductCategory, Product, Location } = require('../models');

// Parse une durée en jours : entier >= 0, sinon null.
const parseDays = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n >= 0 ? n : null;
};

// GET /api/categories
exports.getAll = async (req, res) => {
  try {
    const categories = await ProductCategory.findAll({
      order: [['name', 'ASC']],
    });

    res.json(categories);
  } catch (error) {
    console.error('Erreur getAll categories:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET /api/categories/:id
exports.getOne = async (req, res) => {
  try {
    const household_id = req.householdId;

    const category = await ProductCategory.findByPk(req.params.id, {
      include: [
        {
          model: Product,
          as: 'products',
          where: { household_id, deleted_at: null },
          required: false,
          include: [{ model: Location, as: 'location' }],
        },
      ],
    });

    if (!category) return res.status(404).json({ message: 'Catégorie non trouvée' });

    res.json(category);
  } catch (error) {
    console.error('Erreur getOne category:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// PUT /api/categories/:id
// Configure les durées de conservation utilisées pour l'estimation auto.
exports.update = async (req, res) => {
  try {
    const category = await ProductCategory.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: 'Catégorie non trouvée' });

    const { avg_shelf_days, avg_shelf_days_opened, avg_shelf_days_freezer, storage_instructions } = req.body;
    const updates = {};

    const setDays = (key, value) => {
      if (value === undefined) return;
      if (value === null || value === '') { updates[key] = null; return; }
      const n = parseInt(value, 10);
      if (Number.isInteger(n) && n >= 0) updates[key] = n;
    };
    setDays('avg_shelf_days', avg_shelf_days);
    setDays('avg_shelf_days_opened', avg_shelf_days_opened);
    setDays('avg_shelf_days_freezer', avg_shelf_days_freezer);
    if (storage_instructions !== undefined) updates.storage_instructions = storage_instructions || null;

    await category.update(updates);
    res.json(category);
  } catch (error) {
    console.error('Erreur update category:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST /api/categories
// Crée une catégorie personnalisée avec sa durée de conservation par défaut
// (avg_shelf_days), appliquée automatiquement à un produit ajouté sans date.
exports.create = async (req, res) => {
  try {
    const { name, icon, color, avg_shelf_days, avg_shelf_days_freezer } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Le nom de la catégorie est requis' });
    }
    const trimmed = name.trim();

    // Pas de doublon de nom (insensible à la casse)
    const existing = await ProductCategory.findOne({
      where: { name: { [Op.iLike]: trimmed } },
    });
    if (existing) {
      return res.status(400).json({ message: 'Une catégorie porte déjà ce nom' });
    }

    const category = await ProductCategory.create({
      name: trimmed,
      icon: icon?.trim() || '📦',
      color: color || '#6366f1',
      avg_shelf_days: parseDays(avg_shelf_days),
      avg_shelf_days_freezer: parseDays(avg_shelf_days_freezer),
      is_system: false,
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Erreur create category:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// DELETE /api/categories/:id - seulement les catégories personnalisées
exports.delete = async (req, res) => {
  try {
    const category = await ProductCategory.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: 'Catégorie non trouvée' });

    if (category.is_system) {
      return res.status(403).json({ message: 'Les catégories système ne peuvent pas être supprimées' });
    }

    // Les produits liés sont détachés (et non supprimés)
    await Product.update({ category_id: null }, { where: { category_id: category.id } });
    await category.destroy();

    res.json({ message: 'Catégorie supprimée' });
  } catch (error) {
    console.error('Erreur delete category:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};