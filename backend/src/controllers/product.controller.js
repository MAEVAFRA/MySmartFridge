const { Op } = require('sequelize');
const { Product, Location, ProductCategory, HouseholdMember } = require('../models');

// Récupère le household_id de l'utilisateur connecté
const getHouseholdId = async (userId) => {
  const member = await HouseholdMember.findOne({ where: { user_id: userId } });
  if (!member) throw new Error('Aucun foyer trouvé pour cet utilisateur');
  return member.household_id;
};

// GET /api/products
exports.getAll = async (req, res) => {
  try {
    const household_id = await getHouseholdId(req.user.id);
    const { location_id, category_id, search } = req.query;

    const where = { household_id, deleted_at: null };
    if (location_id)  where.location_id  = location_id;
    if (category_id)  where.category_id  = category_id;
    if (search)       where.name         = { [Op.iLike]: `%${search}%` };

    const products = await Product.findAll({
      where,
      include: [
        { model: Location,        as: 'location' },
        { model: ProductCategory, as: 'category' },
      ],
      order: [['expires_at', 'ASC NULLS LAST']],
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
    const household_id = await getHouseholdId(req.user.id);
    const { days = 7 } = req.query;

    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + parseInt(days));

    const products = await Product.findAll({
      where: {
        household_id,
        deleted_at: null,
        expires_at: {
          [Op.lte]: limitDate,
          [Op.gte]: new Date(),
        },
      },
      include: [
        { model: Location,        as: 'location' },
        { model: ProductCategory, as: 'category' },
      ],
      order: [['expires_at', 'ASC']],
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
    const household_id = await getHouseholdId(req.user.id);

    const product = await Product.findOne({
      where: { id: req.params.id, household_id, deleted_at: null },
      include: [
        { model: Location,        as: 'location' },
        { model: ProductCategory, as: 'category' },
      ],
    });

    if (!product) return res.status(404).json({ message: 'Produit non trouvé' });
    res.json(product);
  } catch (error) {
    console.error('Erreur getOne product:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST /api/products
exports.create = async (req, res) => {
  try {
    const household_id = await getHouseholdId(req.user.id);
    const { name, quantity, unit, expires_at, barcode, notes, location_id, category_id, brand, price } = req.body;

    const product = await Product.create({
      name, quantity, unit, expires_at, barcode, notes,
      location_id, category_id, brand, price,
      household_id,
      added_by: req.user.id,
      expiry_source: 'manual',
    });

    const full = await Product.findByPk(product.id, {
      include: [
        { model: Location,        as: 'location' },
        { model: ProductCategory, as: 'category' },
      ],
    });

    res.status(201).json(full);
  } catch (error) {
    console.error('Erreur create product:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// PUT /api/products/:id
exports.update = async (req, res) => {
  try {
    const household_id = await getHouseholdId(req.user.id);

    const product = await Product.findOne({
      where: { id: req.params.id, household_id, deleted_at: null },
    });

    if (!product) return res.status(404).json({ message: 'Produit non trouvé' });

    const { name, quantity, unit, expires_at, barcode, notes, location_id, category_id, brand, price } = req.body;
    await product.update({ name, quantity, unit, expires_at, barcode, notes, location_id, category_id, brand, price });

    const updated = await Product.findByPk(product.id, {
      include: [
        { model: Location,        as: 'location' },
        { model: ProductCategory, as: 'category' },
      ],
    });

    res.json(updated);
  } catch (error) {
    console.error('Erreur update product:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// DELETE /api/products/:id
exports.delete = async (req, res) => {
  try {
    const household_id = await getHouseholdId(req.user.id);

    const product = await Product.findOne({
      where: { id: req.params.id, household_id, deleted_at: null },
    });

    if (!product) return res.status(404).json({ message: 'Produit non trouvé' });

    // Soft delete
    await product.update({ deleted_at: new Date() });

    res.json({ message: 'Produit supprimé' });
  } catch (error) {
    console.error('Erreur delete product:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};