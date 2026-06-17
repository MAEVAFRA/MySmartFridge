const { Location, Product, ProductCategory } = require('../models');

// Types d'emplacement autorisés
const ALLOWED_TYPES = ['fridge', 'freezer', 'pantry', 'cellar', 'other'];

// GET /api/locations
exports.getAll = async (req, res) => {
  try {
    const household_id = req.householdId;

    const locations = await Location.findAll({
      where: { household_id, deleted_at: null },
      order: [['display_order', 'ASC']],
    });

    res.json(locations);
  } catch (error) {
    console.error('Erreur getAll locations:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET /api/locations/:id
exports.getOne = async (req, res) => {
  try {
    const household_id = req.householdId;

    const location = await Location.findOne({
      where: { id: req.params.id, household_id, deleted_at: null },
      include: [
        {
          model: Product,
          as: 'products',
          where: { household_id, deleted_at: null },
          required: false,
          include: [{ model: ProductCategory, as: 'category' }],
        },
      ],
    });

    if (!location) return res.status(404).json({ message: 'Emplacement non trouvé' });

    res.json(location);
  } catch (error) {
    console.error('Erreur getOne location:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST /api/locations
exports.create = async (req, res) => {
  try {
    const household_id = req.householdId;
    const { name, type, icon, color, temperature_celsius } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Le nom de l\'emplacement est requis' });
    }

    if (type && !ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({ message: `Type invalide. Valeurs autorisées : ${ALLOWED_TYPES.join(', ')}` });
    }

    // Placer le nouvel emplacement à la fin
    const maxOrder = await Location.max('display_order', {
      where: { household_id, deleted_at: null },
    });
    const display_order = (Number.isFinite(maxOrder) ? maxOrder : -1) + 1;

    const location = await Location.create({
      household_id,
      name: name.trim(),
      type: type || 'other',
      icon: icon || '🗄️',
      color: color || '#6366f1',
      temperature_celsius: temperature_celsius ?? null,
      display_order,
      is_default: false,
    });

    res.status(201).json(location);
  } catch (error) {
    console.error('Erreur create location:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// PUT /api/locations/:id
exports.update = async (req, res) => {
  try {
    const household_id = req.householdId;

    const location = await Location.findOne({
      where: { id: req.params.id, household_id, deleted_at: null },
    });

    if (!location) return res.status(404).json({ message: 'Emplacement non trouvé' });

    const { name, type, icon, color, temperature_celsius, display_order } = req.body;

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ message: 'Le nom ne peut pas être vide' });
    }

    if (type !== undefined && type && !ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({ message: `Type invalide. Valeurs autorisées : ${ALLOWED_TYPES.join(', ')}` });
    }

    // Ne mettre à jour que les champs fournis
    const updates = {};
    if (name !== undefined)                updates.name = name.trim();
    if (type !== undefined)                updates.type = type;
    if (icon !== undefined)                updates.icon = icon;
    if (color !== undefined)               updates.color = color;
    if (temperature_celsius !== undefined) updates.temperature_celsius = temperature_celsius;
    if (display_order !== undefined)       updates.display_order = display_order;

    await location.update(updates);

    res.json(location);
  } catch (error) {
    console.error('Erreur update location:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// DELETE /api/locations/:id
exports.delete = async (req, res) => {
  try {
    const household_id = req.householdId;

    const location = await Location.findOne({
      where: { id: req.params.id, household_id, deleted_at: null },
    });

    if (!location) return res.status(404).json({ message: 'Emplacement non trouvé' });

    // Détacher les produits de cet emplacement (ils deviennent "sans emplacement")
    const reassignedCount = await Product.update(
      { location_id: null },
      { where: { location_id: location.id, household_id, deleted_at: null } }
    );

    // Soft delete de l'emplacement
    await location.update({ deleted_at: new Date() });

    res.json({
      message: 'Emplacement supprimé',
      reassigned_products: Array.isArray(reassignedCount) ? reassignedCount[0] : 0,
    });
  } catch (error) {
    console.error('Erreur delete location:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};