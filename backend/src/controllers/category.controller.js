const { ProductCategory, Product, Location, HouseholdMember } = require('../models');

const getHouseholdId = async (userId) => {
  const member = await HouseholdMember.findOne({ where: { user_id: userId } });
  if (!member) throw new Error('Aucun foyer trouvé pour cet utilisateur');
  return member.household_id;
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
    const household_id = await getHouseholdId(req.user.id);

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

// POST /api/categories — créer une catégorie personnalisée
exports.create = async (req, res) => {
  try {
    const { name, icon, color, avg_shelf_days, avg_shelf_days_opened, avg_shelf_days_freezer, storage_instructions } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Le nom est obligatoire' });
    }

    const category = await ProductCategory.create({
      name: name.trim(),
      icon: icon || '📦',
      color: color || '#6b7280',
      avg_shelf_days: avg_shelf_days === '' || avg_shelf_days == null ? null : avg_shelf_days,
      avg_shelf_days_opened: avg_shelf_days_opened === '' || avg_shelf_days_opened == null ? null : avg_shelf_days_opened,
      avg_shelf_days_freezer: avg_shelf_days_freezer === '' || avg_shelf_days_freezer == null ? null : avg_shelf_days_freezer,
      storage_instructions: storage_instructions || null,
      is_system: false,
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Erreur create category:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// PUT /api/categories/:id — modifier n'importe quelle catégorie (par défaut ou perso)
exports.update = async (req, res) => {
  try {
    const category = await ProductCategory.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: 'Catégorie non trouvée' });

    const { name, icon, color, avg_shelf_days, avg_shelf_days_opened, avg_shelf_days_freezer, storage_instructions } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (icon !== undefined) updates.icon = icon;
    if (color !== undefined) updates.color = color;
    if (avg_shelf_days !== undefined) updates.avg_shelf_days = avg_shelf_days === '' ? null : avg_shelf_days;
    if (avg_shelf_days_opened !== undefined) updates.avg_shelf_days_opened = avg_shelf_days_opened === '' ? null : avg_shelf_days_opened;
    if (avg_shelf_days_freezer !== undefined) updates.avg_shelf_days_freezer = avg_shelf_days_freezer === '' ? null : avg_shelf_days_freezer;
    if (storage_instructions !== undefined) updates.storage_instructions = storage_instructions;

    await category.update(updates);

    res.json(category);
  } catch (error) {
    console.error('Erreur update category:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// DELETE /api/categories/:id — supprimer n'importe quelle catégorie (par défaut ou perso)
exports.delete = async (req, res) => {
  try {
    const category = await ProductCategory.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: 'Catégorie non trouvée' });

    await category.destroy();

    res.json({ message: 'Catégorie supprimée' });
  } catch (error) {
    console.error('Erreur delete category:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};