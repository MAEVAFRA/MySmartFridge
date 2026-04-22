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