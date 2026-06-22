const { Op } = require('sequelize');
const { Expense, User, ExpenseSplit, HouseholdMember } = require('../models');

const paidByInclude = { model: User, as: 'paidBy', attributes: ['id', 'name', 'email'] };
const splitInclude = { model: ExpenseSplit, as: 'splits', include: [{ model: User, attributes: ['id', 'name'] }] };

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Valide un montant et renvoie le nombre, ou null si invalide.
const parseAmount = (value) => {
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Crée les parts d'une dépense depuis [{ user_id, share_amount }], en ne gardant
// que les membres réels du foyer et les montants valides (>= 0).
const createSplits = async (expense, splits, householdId) => {
  if (!Array.isArray(splits) || splits.length === 0) return;
  const members = await HouseholdMember.findAll({ where: { household_id: householdId } });
  const memberIds = new Set(members.map((m) => m.user_id));
  const rows = [];
  for (const s of splits) {
    const uid = parseInt(s.user_id, 10);
    const amt = parseFloat(s.share_amount);
    if (memberIds.has(uid) && Number.isFinite(amt) && amt >= 0) {
      rows.push({ expense_id: expense.id, user_id: uid, share_amount: round2(amt) });
    }
  }
  if (rows.length) await ExpenseSplit.bulkCreate(rows);
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
      include: [paidByInclude, splitInclude],
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
    const { amount, label, category, store_name, payment_method, expense_date, currency, splits } = req.body;

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

    await createSplits(expense, splits, household_id);

    const full = await Expense.findByPk(expense.id, { include: [paidByInclude, splitInclude] });
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

    // Remplace les parts si le champ splits est fourni (tableau, éventuellement vide)
    if (req.body.splits !== undefined) {
      await ExpenseSplit.destroy({ where: { expense_id: expense.id } });
      await createSplits(expense, req.body.splits, household_id);
    }

    const updated = await Expense.findByPk(expense.id, { include: [paidByInclude, splitInclude] });
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

// GET /api/expenses/balances
// Soldes du foyer à partir des parts NON réglées : solde net par membre +
// dettes nettes par paire (qui doit combien à qui).
exports.balances = async (req, res) => {
  try {
    const household_id = req.householdId;

    const members = await HouseholdMember.findAll({
      where: { household_id },
      include: [{ model: User, attributes: ['id', 'name'] }],
    });
    const nameOf = new Map(members.map((m) => [m.user_id, m.User?.name || 'Membre']));
    const memberIds = members.map((m) => m.user_id);

    // Parts non réglées des dépenses (non supprimées) du foyer
    const splits = await ExpenseSplit.findAll({
      where: { settled: false },
      include: [{
        model: Expense,
        attributes: ['id', 'paid_by'],
        where: { household_id, deleted_at: null },
        required: true,
      }],
    });

    // raw[debtor][creditor] = montant que debtor doit à creditor
    const raw = {};
    for (const s of splits) {
      const creditor = s.Expense.paid_by;
      const debtor = s.user_id;
      if (!creditor || debtor === creditor) continue; // on ignore la part du payeur lui-même
      raw[debtor] = raw[debtor] || {};
      raw[debtor][creditor] = (raw[debtor][creditor] || 0) + (parseFloat(s.share_amount) || 0);
    }

    // Dettes nettes par paire (compense les deux sens)
    const debts = [];
    for (let i = 0; i < memberIds.length; i += 1) {
      for (let j = i + 1; j < memberIds.length; j += 1) {
        const a = memberIds[i];
        const b = memberIds[j];
        const ab = (raw[a] && raw[a][b]) || 0;
        const ba = (raw[b] && raw[b][a]) || 0;
        const diff = round2(ab - ba);
        if (diff > 0) debts.push({ debtor_id: a, debtor_name: nameOf.get(a), creditor_id: b, creditor_name: nameOf.get(b), amount: diff });
        else if (diff < 0) debts.push({ debtor_id: b, debtor_name: nameOf.get(b), creditor_id: a, creditor_name: nameOf.get(a), amount: -diff });
      }
    }

    // Solde net par membre : (ce qu'on lui doit) - (ce qu'il doit)
    const net = {};
    memberIds.forEach((id) => { net[id] = 0; });
    for (const d of debts) {
      net[d.debtor_id] = round2(net[d.debtor_id] - d.amount);
      net[d.creditor_id] = round2(net[d.creditor_id] + d.amount);
    }
    const balances = members
      .map((m) => ({ user_id: m.user_id, name: nameOf.get(m.user_id), net: net[m.user_id] || 0 }))
      .sort((a, b) => b.net - a.net);

    res.json({ balances, debts: debts.sort((a, b) => b.amount - a.amount) });
  } catch (error) {
    console.error('Erreur balances expenses:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST /api/expenses/settle { user_a, user_b }
// Marque comme réglées toutes les parts non réglées entre deux membres (les deux sens).
exports.settle = async (req, res) => {
  try {
    const household_id = req.householdId;
    const a = parseInt(req.body.user_a, 10);
    const b = parseInt(req.body.user_b, 10);
    if (!a || !b || a === b) {
      return res.status(400).json({ message: 'Deux membres distincts sont requis' });
    }

    const splits = await ExpenseSplit.findAll({
      where: { settled: false, user_id: { [Op.in]: [a, b] } },
      include: [{
        model: Expense,
        attributes: ['id', 'paid_by'],
        where: { household_id, deleted_at: null, paid_by: { [Op.in]: [a, b] } },
        required: true,
      }],
    });

    // Ne régler que les parts "croisées" (un membre doit à l'autre)
    const toSettle = splits.filter((s) => s.user_id !== s.Expense.paid_by);
    const ids = toSettle.map((s) => s.id);
    const amount = round2(toSettle.reduce((sum, s) => sum + (parseFloat(s.share_amount) || 0), 0));

    if (ids.length) {
      await ExpenseSplit.update(
        { settled: true, settled_at: new Date(), settled_by: req.user.id },
        { where: { id: { [Op.in]: ids } } }
      );
    }

    res.json({ message: 'Dette réglée', settled_count: ids.length, settled_amount: amount });
  } catch (error) {
    console.error('Erreur settle expenses:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
