const { Location, Product, ProductCategory, HouseholdMember } = require('../models');

const getHouseholdId = async (userId) => {
  const member = await HouseholdMember.findOne({ where: { user_id: userId } });
  if (!member) throw new Error('Aucun foyer trouvé pour cet utilisateur');
  return member.household_id;
};

// GET /api/locations
exports.getAll = async (req, res) => {
  try {
    const household_id = await getHouseholdId(req.user.id);

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
    const household_id = await getHouseholdId(req.user.id);

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