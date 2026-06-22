const { Op } = require('sequelize');
const { Product, Location, ProductCategory, ProductConsumptionLog } = require('../models');

// Durée de conservation estimée (jours) selon la catégorie et le type
// d'emplacement : au congélateur on privilégie avg_shelf_days_freezer.
const estimateShelfDays = (category, location) => {
  if (!category) return null;
  if (location && location.type === 'freezer' && category.avg_shelf_days_freezer) {
    return category.avg_shelf_days_freezer;
  }
  return category.avg_shelf_days ?? null;
};

const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// GET /api/products
exports.getAll = async (req, res) => {
  try {
    const household_id = req.householdId;
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
// Renvoie les produits déjà périmés ET ceux qui expirent dans les `days` prochains jours.
// Les produits périmés (expires_at < maintenant) apparaissent en premier (les plus anciens d'abord).
exports.getExpiring = async (req, res) => {
  try {
    const household_id = req.householdId;
    const { days = 7 } = req.query;

    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + parseInt(days));

    const products = await Product.findAll({
      where: {
        household_id,
        deleted_at: null,
        expires_at: {
          [Op.ne]: null,
          [Op.lte]: limitDate,
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

// GET /api/products/barcode/:barcode
// Interroge Open Food Facts pour pré-remplir le formulaire produit à partir d'un
// code-barre (EAN-8 / EAN-13 / UPC). Aucune écriture en base : on renvoie juste
// les champs utiles au formulaire (nom, marque, photo). Endpoint partagé par le
// front web et, plus tard, l'app mobile.
exports.lookupBarcode = async (req, res) => {
  const { barcode } = req.params;

  if (!/^\d{6,14}$/.test(barcode)) {
    return res.status(400).json({ message: 'Code-barre invalide' });
  }

  // Timeout pour ne pas bloquer la requête si Open Food Facts est lent/indisponible.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const fields = 'product_name,product_name_fr,brands,image_front_url,image_url,quantity';
    const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=${fields}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'MySmartFridge/1.0 (projet etudiant)' },
    });

    if (!response.ok) {
      return res.status(502).json({ message: 'Service Open Food Facts indisponible' });
    }

    const data = await response.json();
    if (data.status !== 1 || !data.product) {
      return res.status(404).json({ message: 'Aucun produit trouvé pour ce code-barre', barcode });
    }

    const p = data.product;
    const name = (p.product_name_fr || p.product_name || '').trim();
    const brand = (p.brands || '').split(',')[0].trim();

    res.json({
      barcode,
      name,
      brand: brand || null,
      image_url: p.image_front_url || p.image_url || null,
      quantity_text: p.quantity || null,
      source: 'openfoodfacts',
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({ message: 'Open Food Facts ne répond pas, réessayez' });
    }
    console.error('Erreur lookupBarcode:', error);
    res.status(502).json({ message: 'Erreur lors de la consultation Open Food Facts', error: error.message });
  } finally {
    clearTimeout(timeout);
  }
};

// GET /api/products/:id
exports.getOne = async (req, res) => {
  try {
    const household_id = req.householdId;

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
    const household_id = req.householdId;
    const { name, quantity, unit, expires_at, barcode, notes, location_id, category_id, brand, price, image_url } = req.body;

    // Si l'utilisateur n'a pas saisi de date, on l'estime depuis la catégorie
    // (et le type d'emplacement). expiry_source trace l'origine de la date.
    let finalExpiry = expires_at || null;
    let expirySource = finalExpiry ? 'manual' : null;

    if (!finalExpiry && category_id) {
      const [category, location] = await Promise.all([
        ProductCategory.findByPk(category_id),
        location_id ? Location.findByPk(location_id) : null,
      ]);
      const days = estimateShelfDays(category, location);
      if (days != null) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + days);
        finalExpiry = ymd(d);
        expirySource = 'category_avg';
      }
    }

    const product = await Product.create({
      name, quantity, unit, barcode, notes,
      location_id, category_id, brand, price, image_url,
      expires_at: finalExpiry,
      household_id,
      added_by: req.user.id,
      expiry_source: expirySource || 'manual',
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
    const household_id = req.householdId;

    const product = await Product.findOne({
      where: { id: req.params.id, household_id, deleted_at: null },
    });

    if (!product) return res.status(404).json({ message: 'Produit non trouvé' });

    const { name, quantity, unit, expires_at, barcode, notes, location_id, category_id, brand, price, image_url } = req.body;
    await product.update({ name, quantity, unit, expires_at, barcode, notes, location_id, category_id, brand, price, image_url });

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
    const household_id = req.householdId;

    const product = await Product.findOne({
      where: { id: req.params.id, household_id, deleted_at: null },
    });

    if (!product) return res.status(404).json({ message: 'Produit non trouvé' });

    // Soft delete
    await product.update({ deleted_at: new Date() });

    // Journalise le motif de sortie pour alimenter les statistiques de
    // consommation / gaspillage (consumed | thrown | expired).
    const reason = (req.body && req.body.reason) || req.query.reason;
    if (['consumed', 'thrown', 'expired'].includes(reason)) {
      await ProductConsumptionLog.create({
        household_id,
        user_id: req.user.id,
        product_id: product.id,
        category_id: product.category_id || null,
        action: reason,
        quantity: product.quantity || 1,
        unit: product.unit || null,
        price_at_time: product.price_per_unit ?? product.price ?? null,
        logged_at: new Date(),
      });
    }

    res.json({ message: 'Produit supprimé' });
  } catch (error) {
    console.error('Erreur delete product:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};