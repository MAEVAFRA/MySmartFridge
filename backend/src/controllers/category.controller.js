const { ProductCategory, Product, Location } = require('../models');

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