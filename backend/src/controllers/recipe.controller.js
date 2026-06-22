const { Op } = require('sequelize');
const {
  sequelize,
  Recipe,
  RecipeIngredient,
  RecipeStep,
  FavoriteRecipe,
  CookingHistory,
  CookingHistoryItem,
  ProductConsumptionLog,
  Product,
  Location,
  ProductCategory,
  User,
} = require('../models');

// ─── Matching ingrédient ↔ produit ───────────────────────────────
// On normalise (minuscules, sans accents, sans ponctuation) puis on
// compare les mots-clés au singulier. Tolère pluriels et ligatures (œ/æ).

const normalize = (s) =>
  (s || '')
    .toString()
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const STOP = new Set(['de', 'la', 'le', 'les', 'des', 'du', 'au', 'aux', 'a', 'l', 'd', 'et', 'en', 'with']);
const singular = (w) => (w.length > 3 && (w.endsWith('s') || w.endsWith('x')) ? w.slice(0, -1) : w);
const keywords = (s) =>
  normalize(s)
    .split(' ')
    .filter((w) => w.length >= 2 && !STOP.has(w))
    .map(singular);

const ingredientMatchesProduct = (ingName, prodName) => {
  const a = keywords(ingName);
  const b = keywords(prodName);
  if (!a.length || !b.length) return false;
  if (a.some((t) => b.includes(t))) return true;
  const na = normalize(ingName).replace(/\s+/g, '');
  const nb = normalize(prodName).replace(/\s+/g, '');
  return na.length >= 4 && nb.length >= 4 && (na.includes(nb) || nb.includes(na));
};

// Nb de jours avant péremption (négatif = déjà périmé), null si pas de date.
const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / (24 * 60 * 60 * 1000));
};

const EXPIRY_SOON_DAYS = 5;

// Charge les produits en stock du foyer (quantité > 0).
const loadStock = (household_id) =>
  Product.findAll({
    where: { household_id, deleted_at: null, quantity: { [Op.gt]: 0 } },
    attributes: ['id', 'name', 'quantity', 'unit', 'expires_at', 'category_id', 'price', 'price_per_unit'],
  });

// Calcule l'état d'une recette par rapport au stock.
// Renvoie les ingrédients enrichis + un résumé (compteurs, ratio, anti-gaspi).
const computeMatch = (recipe, stock) => {
  const ingredients = (recipe.ingredients || []).map((ing) => {
    const ingJson = ing.toJSON ? ing.toJSON() : ing;
    const product = stock.find((p) => ingredientMatchesProduct(ingJson.name, p.name));
    let near_expiry = false;
    let days_left = null;
    if (product) {
      days_left = daysUntil(product.expires_at);
      near_expiry = days_left !== null && days_left <= EXPIRY_SOON_DAYS;
    }
    return {
      ...ingJson,
      available: !!product,
      near_expiry,
      matched_product: product
        ? { id: product.id, name: product.name, quantity: product.quantity, unit: product.unit, expires_at: product.expires_at, days_left }
        : null,
    };
  });

  const required = ingredients.filter((i) => !i.is_optional);
  const available_required = required.filter((i) => i.available);
  const missing = required.filter((i) => !i.available);
  const expiringUsed = ingredients
    .filter((i) => i.available && i.near_expiry)
    .map((i) => i.matched_product.name);

  const soonest = ingredients
    .filter((i) => i.matched_product && i.matched_product.days_left !== null)
    .map((i) => i.matched_product.days_left)
    .sort((a, b) => a - b)[0];

  return {
    ingredients,
    available_count: available_required.length,
    required_count: required.length,
    missing_count: missing.length,
    missing_names: missing.map((i) => i.name),
    match_ratio: required.length ? available_required.length / required.length : 0,
    uses_expiring: expiringUsed.length > 0,
    expiring_products: expiringUsed,
    soonest_expiry_days: soonest === undefined ? null : soonest,
  };
};

// Portée des recettes visibles : recettes globales (household_id null) + celles du foyer.
const recipeScope = (household_id) => ({
  [Op.or]: [{ household_id: null }, { household_id }],
});

const includeContent = [
  { model: RecipeIngredient, as: 'ingredients', separate: true, order: [['display_order', 'ASC']] },
  { model: RecipeStep, as: 'steps', separate: true, order: [['step_number', 'ASC']] },
];

const favoriteIdsFor = async (user_id) => {
  const favs = await FavoriteRecipe.findAll({ where: { user_id }, attributes: ['recipe_id'] });
  return new Set(favs.map((f) => f.recipe_id));
};

// ─── GET /api/recipes ─────────────────────────────────────────────
// Filtres : ?search= &diet= &maxTime= &sort=match|time|title &favorites=true
exports.getAll = async (req, res) => {
  try {
    const household_id = req.householdId;
    const { search, diet, maxTime, sort = 'match', favorites } = req.query;

    const where = recipeScope(household_id);
    if (search) where.title = { [Op.iLike]: `%${search}%` };
    if (diet) where.diet_tags = { [Op.iLike]: `%${diet}%` };
    if (maxTime) where.ready_in_minutes = { [Op.lte]: parseInt(maxTime, 10) };

    const [recipes, stock, favIds] = await Promise.all([
      Recipe.findAll({ where, include: includeContent }),
      loadStock(household_id),
      favoriteIdsFor(req.user.id),
    ]);

    let result = recipes.map((r) => {
      const match = computeMatch(r, stock);
      return { ...r.toJSON(), ...match, is_favorite: favIds.has(r.id) };
    });

    if (favorites === 'true') result = result.filter((r) => r.is_favorite);

    const sorters = {
      match: (a, b) =>
        Number(b.uses_expiring) - Number(a.uses_expiring) ||
        b.match_ratio - a.match_ratio ||
        a.missing_count - b.missing_count,
      time: (a, b) => (a.ready_in_minutes || 9999) - (b.ready_in_minutes || 9999),
      title: (a, b) => a.title.localeCompare(b.title),
    };
    result.sort(sorters[sort] || sorters.match);

    res.json(result);
  } catch (error) {
    console.error('Erreur getAll recipes:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ─── GET /api/recipes/suggestions ─────────────────────────────────
// Recettes réalisables (au moins un ingrédient en stock), priorité aux
// recettes qui utilisent des produits proches de la péremption.
exports.getSuggestions = async (req, res) => {
  try {
    const household_id = req.householdId;
    const limit = parseInt(req.query.limit, 10) || 6;

    const [recipes, stock, favIds] = await Promise.all([
      Recipe.findAll({ where: recipeScope(household_id), include: includeContent }),
      loadStock(household_id),
      favoriteIdsFor(req.user.id),
    ]);

    const result = recipes
      .map((r) => {
        const match = computeMatch(r, stock);
        return { ...r.toJSON(), ...match, is_favorite: favIds.has(r.id) };
      })
      .filter((r) => r.available_count > 0)
      .sort(
        (a, b) =>
          Number(b.uses_expiring) - Number(a.uses_expiring) ||
          (a.soonest_expiry_days ?? 9999) - (b.soonest_expiry_days ?? 9999) ||
          b.match_ratio - a.match_ratio
      )
      .slice(0, limit);

    res.json(result);
  } catch (error) {
    console.error('Erreur getSuggestions:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ─── GET /api/recipes/history ─────────────────────────────────────
exports.getHistory = async (req, res) => {
  try {
    const household_id = req.householdId;

    const history = await CookingHistory.findAll({
      where: { household_id },
      include: [
        { model: Recipe, attributes: ['id', 'title', 'image_url', 'thumbnail_url'] },
        { model: User, attributes: ['id', 'name'] },
        { model: CookingHistoryItem, as: 'items' },
      ],
      order: [['cooked_at', 'DESC']],
      limit: 50,
    });

    res.json(history);
  } catch (error) {
    console.error('Erreur getHistory recipes:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ─── GET /api/recipes/:id ─────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const household_id = req.householdId;

    const recipe = await Recipe.findOne({
      where: { id: req.params.id, ...recipeScope(household_id) },
      include: includeContent,
    });
    if (!recipe) return res.status(404).json({ message: 'Recette non trouvée' });

    const [stock, favIds] = await Promise.all([loadStock(household_id), favoriteIdsFor(req.user.id)]);
    const match = computeMatch(recipe, stock);

    res.json({ ...recipe.toJSON(), ...match, is_favorite: favIds.has(recipe.id) });
  } catch (error) {
    console.error('Erreur getOne recipe:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ─── POST /api/recipes/:id/favorite ───────────────────────────────
exports.addFavorite = async (req, res) => {
  try {
    const household_id = req.householdId;
    const recipe = await Recipe.findOne({ where: { id: req.params.id, ...recipeScope(household_id) } });
    if (!recipe) return res.status(404).json({ message: 'Recette non trouvée' });

    const { rating, personal_notes } = req.body;
    const [fav] = await FavoriteRecipe.findOrCreate({
      where: { user_id: req.user.id, recipe_id: recipe.id },
      defaults: { rating: rating ?? null, personal_notes: personal_notes || null },
    });

    res.status(201).json({ is_favorite: true, favorite: fav });
  } catch (error) {
    console.error('Erreur addFavorite:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ─── DELETE /api/recipes/:id/favorite ─────────────────────────────
exports.removeFavorite = async (req, res) => {
  try {
    await FavoriteRecipe.destroy({ where: { user_id: req.user.id, recipe_id: req.params.id } });
    res.json({ is_favorite: false });
  } catch (error) {
    console.error('Erreur removeFavorite:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ─── POST /api/recipes/:id/cook ───────────────────────────────────
// Marque la recette comme cuisinée : décrémente le stock des produits
// utilisés, journalise la consommation et l'historique de cuisine.
// Body : { servings_made, rating, notes, consumed: [{ product_id, quantity_used, unit }] }
exports.cook = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const household_id = req.householdId;
    const recipe = await Recipe.findOne({
      where: { id: req.params.id, ...recipeScope(household_id) },
      transaction: t,
    });
    if (!recipe) {
      await t.rollback();
      return res.status(404).json({ message: 'Recette non trouvée' });
    }

    const { servings_made, rating, notes, consumed = [] } = req.body;

    const history = await CookingHistory.create(
      {
        user_id: req.user.id,
        household_id,
        recipe_id: recipe.id,
        servings_made: servings_made ?? recipe.servings ?? null,
        rating: rating ?? null,
        notes: notes || null,
        cooked_at: new Date(),
      },
      { transaction: t }
    );

    const consumedSummary = [];
    let depletedCount = 0;

    for (const entry of consumed) {
      const qtyUsed = parseFloat(entry.quantity_used);
      if (!entry.product_id || !(qtyUsed > 0)) continue;

      const product = await Product.findOne({
        where: { id: entry.product_id, household_id, deleted_at: null },
        transaction: t,
      });
      if (!product) continue;

      const newQty = Math.max(0, (product.quantity || 0) - qtyUsed);
      const updates = { quantity: newQty };
      if (newQty === 0) {
        updates.deleted_at = new Date(); // produit épuisé → retiré du stock
        depletedCount += 1;
      }
      await product.update(updates, { transaction: t });

      await CookingHistoryItem.create(
        {
          cooking_history_id: history.id,
          product_id: product.id,
          quantity_used: qtyUsed,
          unit: entry.unit || product.unit,
        },
        { transaction: t }
      );

      await ProductConsumptionLog.create(
        {
          household_id,
          user_id: req.user.id,
          product_id: product.id,
          category_id: product.category_id || null,
          action: 'consumed',
          quantity: qtyUsed,
          unit: entry.unit || product.unit,
          price_at_time: product.price_per_unit ?? product.price ?? null,
          notes: `Recette : ${recipe.title}`,
          logged_at: new Date(),
        },
        { transaction: t }
      );

      consumedSummary.push({ product_id: product.id, name: product.name, quantity_used: qtyUsed, remaining: newQty });
    }

    await t.commit();

    res.status(201).json({
      message: 'Recette cuisinée 🍳',
      history_id: history.id,
      consumed: consumedSummary,
      consumed_count: consumedSummary.length,
      depleted_count: depletedCount,
    });
  } catch (error) {
    await t.rollback();
    console.error('Erreur cook recipe:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
