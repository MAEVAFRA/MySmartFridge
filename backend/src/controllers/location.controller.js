const { Location, Product, Category } = require('../models');

// GET /api/locations
exports.getAll = async (req, res) => {
  try {
    const locations = await Location.findAll({
      order: [['name', 'ASC']],
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
    const location = await Location.findByPk(req.params.id, {
      include: [
        {
          model: Product,
          as: 'products',
          where: { userId: req.user.id },
          required: false,
          include: [{ model: Category, as: 'category' }],
        },
      ],
    });

    if (!location) {
      return res.status(404).json({ message: 'Emplacement non trouvé' });
    }

    res.json(location);
  } catch (error) {
    console.error('Erreur getOne location:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
