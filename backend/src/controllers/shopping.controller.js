const { ShoppingList, ShoppingItem, Product, Location } = require('../models');

// ─── Helpers ──────────────────────────────────────────────────────

const getList = (id, household_id) =>
  ShoppingList.findOne({ where: { id, household_id, deleted_at: null } });

const itemsInclude = {
  model: ShoppingItem,
  as: 'items',
};

// ─── GET /api/shopping-lists ──────────────────────────────────────

exports.getAll = async (req, res) => {
  try {
    const household_id = req.householdId;

    const lists = await ShoppingList.findAll({
      where: { household_id, deleted_at: null },
      include: [itemsInclude],
      order: [
        ['display_order', 'ASC'],
        ['created_at', 'ASC'],
        [{ model: ShoppingItem, as: 'items' }, 'checked', 'ASC'],
        [{ model: ShoppingItem, as: 'items' }, 'created_at', 'ASC'],
      ],
    });

    res.json(lists);
  } catch (error) {
    console.error('Erreur getAll shopping-lists:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ─── POST /api/shopping-lists ─────────────────────────────────────

exports.create = async (req, res) => {
  try {
    const household_id = req.householdId;
    const { name } = req.body;

    const list = await ShoppingList.create({
      household_id,
      name: (name && name.trim()) || 'Liste de courses',
      created_by: req.user.id,
    });

    res.status(201).json({ ...list.toJSON(), items: [] });
  } catch (error) {
    console.error('Erreur create shopping-list:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ─── PUT /api/shopping-lists/:id ──────────────────────────────────

exports.update = async (req, res) => {
  try {
    const household_id = req.householdId;
    const list = await getList(req.params.id, household_id);
    if (!list) return res.status(404).json({ message: 'Liste non trouvée' });

    const { name, completed } = req.body;
    const updates = {};
    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ message: 'Le nom ne peut pas être vide' });
      updates.name = name.trim();
    }
    if (completed !== undefined) updates.completed_at = completed ? new Date() : null;

    await list.update(updates);
    res.json(list);
  } catch (error) {
    console.error('Erreur update shopping-list:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ─── DELETE /api/shopping-lists/:id ───────────────────────────────

exports.delete = async (req, res) => {
  try {
    const household_id = req.householdId;
    const list = await getList(req.params.id, household_id);
    if (!list) return res.status(404).json({ message: 'Liste non trouvée' });

    await list.update({ deleted_at: new Date() });
    res.json({ message: 'Liste supprimée' });
  } catch (error) {
    console.error('Erreur delete shopping-list:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ─── POST /api/shopping-lists/:id/items ───────────────────────────

exports.addItem = async (req, res) => {
  try {
    const household_id = req.householdId;
    const list = await getList(req.params.id, household_id);
    if (!list) return res.status(404).json({ message: 'Liste non trouvée' });

    const { name, quantity, unit, category_id, estimated_price, notes, barcode } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Le nom de l\'article est requis' });
    }

    const item = await ShoppingItem.create({
      list_id: list.id,
      name: name.trim(),
      quantity: quantity ?? 1,
      unit: unit || 'unité',
      category_id: category_id || null,
      estimated_price: estimated_price ?? null,
      notes: notes || null,
      barcode: barcode || null,
      added_by: req.user.id,
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('Erreur addItem:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ─── PUT /api/shopping-lists/:id/items/:itemId ────────────────────

exports.updateItem = async (req, res) => {
  try {
    const household_id = req.householdId;
    const list = await getList(req.params.id, household_id);
    if (!list) return res.status(404).json({ message: 'Liste non trouvée' });

    const item = await ShoppingItem.findOne({
      where: { id: req.params.itemId, list_id: list.id },
    });
    if (!item) return res.status(404).json({ message: 'Article non trouvé' });

    const { name, quantity, unit, checked, category_id, estimated_price, notes } = req.body;
    const updates = {};
    if (name !== undefined)            updates.name = name.trim();
    if (quantity !== undefined)        updates.quantity = quantity;
    if (unit !== undefined)            updates.unit = unit;
    if (category_id !== undefined)     updates.category_id = category_id;
    if (estimated_price !== undefined) updates.estimated_price = estimated_price;
    if (notes !== undefined)           updates.notes = notes;
    if (checked !== undefined) {
      updates.checked = checked;
      updates.checked_at = checked ? new Date() : null;
      updates.checked_by = checked ? req.user.id : null;
    }

    await item.update(updates);
    res.json(item);
  } catch (error) {
    console.error('Erreur updateItem:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ─── DELETE /api/shopping-lists/:id/items/:itemId ─────────────────

exports.deleteItem = async (req, res) => {
  try {
    const household_id = req.householdId;
    const list = await getList(req.params.id, household_id);
    if (!list) return res.status(404).json({ message: 'Liste non trouvée' });

    const item = await ShoppingItem.findOne({
      where: { id: req.params.itemId, list_id: list.id },
    });
    if (!item) return res.status(404).json({ message: 'Article non trouvé' });

    await item.destroy();
    res.json({ message: 'Article supprimé' });
  } catch (error) {
    console.error('Erreur deleteItem:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ─── POST /api/shopping-lists/:id/transfer ────────────────────────
// Transfère les articles cochés vers le stock (crée des produits) puis les retire de la liste.

exports.transferToStock = async (req, res) => {
  try {
    const household_id = req.householdId;
    const list = await getList(req.params.id, household_id);
    if (!list) return res.status(404).json({ message: 'Liste non trouvée' });

    const checkedItems = await ShoppingItem.findAll({
      where: { list_id: list.id, checked: true },
    });

    if (checkedItems.length === 0) {
      return res.status(400).json({ message: 'Aucun article coché à transférer' });
    }

    const { location_id } = req.body;

    // Emplacement cible : celui choisi par l'utilisateur, sinon le défaut, sinon le premier disponible
    let defaultLocation;
    if (location_id) {
      defaultLocation = await Location.findOne({
        where: { id: location_id, household_id, deleted_at: null },
      });
      if (!defaultLocation) {
        return res.status(400).json({ message: 'Emplacement invalide' });
      }
    } else {
      defaultLocation =
        (await Location.findOne({ where: { household_id, deleted_at: null, is_default: true } })) ||
        (await Location.findOne({ where: { household_id, deleted_at: null }, order: [['display_order', 'ASC']] }));
    }

    let transferred = 0;
    for (const it of checkedItems) {
      await Product.create({
        household_id,
        location_id: defaultLocation ? defaultLocation.id : null,
        category_id: it.category_id || null,
        name: it.name,
        quantity: it.quantity || 1,
        unit: it.unit || 'unité',
        barcode: it.barcode || null,
        price: it.estimated_price ?? null,
        added_by: req.user.id,
        expiry_source: 'manual',
      });
      await it.destroy();
      transferred += 1;
    }

    res.json({
      message: `${transferred} article(s) transféré(s) en stock`,
      transferred,
      location: defaultLocation ? defaultLocation.name : null,
    });
  } catch (error) {
    console.error('Erreur transferToStock:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
