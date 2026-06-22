const { Op } = require('sequelize');
const { Expense, User } = require('../models');

const paidByInclude = { model: User, as: 'paidBy', attributes: ['id', 'name', 'email'] };

// Valide un montant et renvoie le nombre, ou null si invalide.
const parseAmount = (value) => {
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// GET /api/expenses?from=YYYY-MM-DD&to=YYYY-MM-DD
// Liste les dépenses du foyer, avec filtre de période optionnel sur expense_date.
exports.getAll = async (req, res) => {
  try {
    const household_id = req.householdId;
    const { from, to } = req.query;

    const where = { household_id, deleted_at: null };
    if (from || to) {
      where.expense_date = {};
      if (from) where.expense_date[Op.gte] = from;
      if (to)   where.expense_date[Op.lte] = to;
    }

    const expenses = await Expense.findAll({
      where,
      include: [paidByInclude],
      order: [['expense_date', 'DESC'], ['created_at', 'DESC']],
    });

    res.json(expenses);
  } catch (error) {
    console.error('Erreur getAll expenses:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET /api/expenses/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
// Totaux de la période : global, par catégorie et par membre (qui a payé).
exports.summary = async (req, res) => {
  try {
    const household_id = req.householdId;
    const { from, to } = req.query;

    const where = { household_id, deleted_at: null };
    if (from || to) {
      where.expense_date = {};
      if (from) where.expense_date[Op.gte] = from;
      if (to)   where.expense_date[Op.lte] = to;
    }

    const expenses = await Expense.findAll({ where, include: [paidByInclude] });

    const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
    const catMap = new Map();
    const memberMap = new Map();
    let total = 0;

    for (const e of expenses) {
      const amount = parseFloat(e.amount) || 0;
      total += amount;

      const cat = e.category || 'Sans catégorie';
      const c = catMap.get(cat) || { category: cat, total: 0, count: 0 };
      c.total += amount;
      c.count += 1;
      catMap.set(cat, c);

      const uid = e.paid_by;
      const m = memberMap.get(uid) || { user_id: uid, name: e.paidBy?.name || 'Inconnu', total: 0, count: 0 };
      m.total += amount;
      m.count += 1;
      memberMap.set(uid, m);
    }

    const byCategory = [...catMap.values()].map((c) => ({ ...c, total: round2(c.total) })).sort((a, b) => b.total - a.total);
    const byMember   = [...memberMap.values()].map((m) => ({ ...m, total: round2(m.total) })).sort((a, b) => b.total - a.total);

    res.json({ total: round2(total), count: expenses.length, by_category: byCategory, by_member: byMember });
  } catch (error) {
    console.error('Erreur summary expenses:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST /api/expenses - Enregistrer une dépense
exports.create = async (req, res) => {
  try {
    const household_id = req.householdId;
    const { amount, label, category, store_name, payment_method, expense_date, currency } = req.body;

    const value = parseAmount(amount);
    if (value === null) {
      return res.status(400).json({ message: 'Le montant doit être un nombre positif' });
    }

    const expense = await Expense.create({
      household_id,
      paid_by: req.user.id,
      amount: value,
      currency: currency || 'EUR',
      label: label?.trim() || null,
      category: category || null,
      store_name: store_name?.trim() || null,
      payment_method: payment_method || null,
      expense_date: expense_date || new Date(),
    });

    const full = await Expense.findByPk(expense.id, { include: [paidByInclude] });
    res.status(201).json(full);
  } catch (error) {
    console.error('Erreur create expense:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// PUT /api/expenses/:id - Modifier une dépense
exports.update = async (req, res) => {
  try {
    const household_id = req.householdId;

    const expense = await Expense.findOne({
      where: { id: req.params.id, household_id, deleted_at: null },
    });
    if (!expense) return res.status(404).json({ message: 'Dépense non trouvée' });

    const { amount, label, category, store_name, payment_method, expense_date, currency } = req.body;
    const updates = {};

    if (amount !== undefined) {
      const value = parseAmount(amount);
      if (value === null) {
        return res.status(400).json({ message: 'Le montant doit être un nombre positif' });
      }
      updates.amount = value;
    }
    if (label !== undefined)          updates.label = label?.trim() || null;
    if (category !== undefined)       updates.category = category || null;
    if (store_name !== undefined)     updates.store_name = store_name?.trim() || null;
    if (payment_method !== undefined) updates.payment_method = payment_method || null;
    if (expense_date !== undefined)   updates.expense_date = expense_date || null;
    if (currency !== undefined)       updates.currency = currency || 'EUR';

    await expense.update(updates);

    const updated = await Expense.findByPk(expense.id, { include: [paidByInclude] });
    res.json(updated);
  } catch (error) {
    console.error('Erreur update expense:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// DELETE /api/expenses/:id - Supprimer une dépense (soft delete)
exports.delete = async (req, res) => {
  try {
    const household_id = req.householdId;

    const expense = await Expense.findOne({
      where: { id: req.params.id, household_id, deleted_at: null },
    });
    if (!expense) return res.status(404).json({ message: 'Dépense non trouvée' });

    await expense.update({ deleted_at: new Date() });
    res.json({ message: 'Dépense supprimée' });
  } catch (error) {
    console.error('Erreur delete expense:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
