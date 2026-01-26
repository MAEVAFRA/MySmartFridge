const { Op } = require('sequelize');
const { Product, Location, Category } = require('../models');

// GET /api/products
exports.getAll = async (req, res) => {
  try {
    const { locationId, categoryId, search } = req.query;
    
    const where = { userId: req.user.id };
    
    if (locationId) where.locationId = locationId;
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }

    const products = await Product.findAll({
      where,
      include: [
        { model: Location, as: 'location' },
        { model: Category, as: 'category' },
      ],
      order: [['expiryDate', 'ASC NULLS LAST']],
    });

    res.json(products);
  } catch (error) {
    console.error('Erreur getAll products:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET /api/products/expiring
exports.getExpiring = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + parseInt(days));

    const products = await Product.findAll({
      where: {
        userId: req.user.id,
        expiryDate: {
          [Op.lte]: limitDate,
          [Op.gte]: new Date(),
        },
      },
      include: [
        { model: Location, as: 'location' },
        { model: Category, as: 'category' },
      ],
      order: [['expiryDate', 'ASC']],
    });

    res.json(products);
  } catch (error) {
    console.error('Erreur getExpiring:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET /api/products/:id
exports.getOne = async (req, res) => {
  try {
    const product = await Product.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [
        { model: Location, as: 'location' },
        { model: Category, as: 'category' },
      ],
    });

    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    res.json(product);
  } catch (error) {
    console.error('Erreur getOne product:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST /api/products
exports.create = async (req, res) => {
  try {
    const { name, quantity, unit, expiryDate, barcode, notes, locationId, categoryId } = req.body;

    const product = await Product.create({
      name,
      quantity,
      unit,
      expiryDate,
      barcode,
      notes,
      locationId,
      categoryId,
      userId: req.user.id,
    });

    const productWithRelations = await Product.findByPk(product.id, {
      include: [
        { model: Location, as: 'location' },
        { model: Category, as: 'category' },
      ],
    });

    res.status(201).json(productWithRelations);
  } catch (error) {
    console.error('Erreur create product:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// PUT /api/products/:id
exports.update = async (req, res) => {
  try {
    const product = await Product.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    const { name, quantity, unit, expiryDate, barcode, notes, locationId, categoryId } = req.body;

    await product.update({
      name,
      quantity,
      unit,
      expiryDate,
      barcode,
      notes,
      locationId,
      categoryId,
    });

    const updatedProduct = await Product.findByPk(product.id, {
      include: [
        { model: Location, as: 'location' },
        { model: Category, as: 'category' },
      ],
    });

    res.json(updatedProduct);
  } catch (error) {
    console.error('Erreur update product:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// DELETE /api/products/:id
exports.delete = async (req, res) => {
  try {
    const product = await Product.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    await product.destroy();

    res.json({ message: 'Produit supprimé' });
  } catch (error) {
    console.error('Erreur delete product:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
