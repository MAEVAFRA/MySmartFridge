const { Category, Product, Location } = require('../models');

// GET /api/categories
exports.getAll = async (req, res) => {
  try {
    const categories = await Category.findAll({
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
    const category = await Category.findByPk(req.params.id, {
      include: [
        {
          model: Product,
          as: 'products',
          where: { userId: req.user.id },
          required: false,
          include: [{ model: Location, as: 'location' }],
        },
      ],
    });

    if (!category) {
      return res.status(404).json({ message: 'Catégorie non trouvée' });
    }

    res.json(category);
  } catch (error) {
    console.error('Erreur getOne category:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
