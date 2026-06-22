const { Op } = require('sequelize');
const { Expense, ExpenseSplit, User, HouseholdMember, AuditLog } = require('../models');

const paidByInclude = { model: User, as: 'paidBy', attributes: ['id', 'name', 'email'] };

const parseAmount = (value) => {
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Récupère les membres du foyer (id, name, email) — utilisé pour valider les participants
const getHouseholdMembersMap = async (household_id) => {
  const members = await HouseholdMember.findAll({ where: { household_id } });
  const userIds = members.map((m) => m.user_id);
  const users = await User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'name', 'email'] });
  const map = {};
  users.forEach((u) => { map[u.id] = u; });
  return map;
};

// Crée les ExpenseSplit pour une dépense donnée, selon le type de partage demandé.
// split_type: 'none' (pas de partage) | 'equal' (parts égales) | 'custom' (montants choisis)
const createSplits = async (expense, split_type, participants, custom_shares, payerId) => {
  if (split_type === 'equal' && Array.isArray(participants) && participants.length > 0) {
    const base = Math.floor((expense.amount / participants.length) * 100) / 100;
    const shares = participants.map(() => base);
    const distributed = Math.round(base * participants.length * 100) / 100;
    const remainder = Math.round((expense.amount - distributed) * 100) / 100;
    shares[shares.length - 1] = Math.round((shares[shares.length - 1] + remainder) * 100) / 100;

    await ExpenseSplit.bulkCreate(
      participants.map((user_id, i) => ({
        expense_id: expense.id,
        user_id,
        share_amount: shares[i],
        settled: Number(user_id) === Number(payerId), // le payeur ne se doit rien à lui-même
      }))
    );
  } else if (split_type === 'custom' && custom_shares && typeof custom_shares === 'object') {
    const entries = Object.entries(custom_shares).filter(([, v]) => parseFloat(v) > 0);
    await ExpenseSplit.bulkCreate(
      entries.map(([user_id, share_amount]) => ({
        expense_id: expense.id,
        user_id: Number(user_id),
        share_amount: Math.round(parseFloat(share_amount) * 100) / 100,
        settled: Number(user_id) === Number(payerId),
      }))
    );
  }
  // split_type === 'none' → dépense personnelle, aucune part créée
};

// GET /api/expenses?from=YYYY-MM-DD&to=YYYY-MM-DD
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
      include: [paidByInclude, { model: ExpenseSplit, as: 'splits' }],
      order: [['expense_date', 'DESC'], ['created_at', 'DESC']],
    });

    // Enrichir les splits avec le nom de l'utilisateur (sans dépendre d'une association User déjà définie)
    const membersMap = await getHouseholdMembersMap(household_id);
    const enriched = expenses.map((e) => {
      const json = e.toJSON();
      json.splits = (json.splits || []).map((s) => ({ ...s, user: membersMap[s.user_id] || null }));
      return json;
    });

    res.json(enriched);
  } catch (error) {
    console.error('Erreur getAll expenses:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST /api/expenses
exports.create = async (req, res) => {
  try {
    const household_id = req.householdId;
    const {
      amount, label, category, store_name, payment_method, expense_date, currency,
      split_type, participants, custom_shares,
    } = req.body;

    const value = parseAmount(amount);
    if (value === null) {
      return res.status(400).json({ message: 'Le montant doit être un nombre positif' });
    }

    const payerId = req.body.paid_by ? Number(req.body.paid_by) : req.user.id;

    // Validation du partage personnalisé : la somme doit correspondre au montant total
    if (split_type === 'custom' && custom_shares) {
      const sum = Object.values(custom_shares).reduce((s, v) => s + (parseFloat(v) || 0), 0);
      if (Math.abs(sum - value) > 0.02) {
        return res.status(400).json({ message: `La somme des parts (${sum.toFixed(2)} €) ne correspond pas au montant total (${value.toFixed(2)} €)` });
      }
    }

    const expense = await Expense.create({
      household_id,
      paid_by: payerId,
      amount: value,
      currency: currency || 'EUR',
      label: label?.trim() || null,
      category: category || null,
      store_name: store_name?.trim() || null,
      payment_method: payment_method || null,
      expense_date: expense_date || new Date(),
    });

    await createSplits(expense, split_type, participants, custom_shares, payerId);

    const full = await Expense.findByPk(expense.id, {
      include: [paidByInclude, { model: ExpenseSplit, as: 'splits' }],
    });
    res.status(201).json(full);
  } catch (error) {
    console.error('Erreur create expense:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// PUT /api/expenses/:id
exports.update = async (req, res) => {
  try {
    const household_id = req.householdId;

    const expense = await Expense.findOne({
      where: { id: req.params.id, household_id, deleted_at: null },
    });
    if (!expense) return res.status(404).json({ message: 'Dépense non trouvée' });

    const {
      amount, label, category, store_name, payment_method, expense_date, currency,
      split_type, participants, custom_shares,
    } = req.body;

    const updates = {};
    if (amount !== undefined) {
      const value = parseAmount(amount);
      if (value === null) return res.status(400).json({ message: 'Le montant doit être un nombre positif' });
      updates.amount = value;
    }
    if (label !== undefined)          updates.label = label?.trim() || null;
    if (category !== undefined)       updates.category = category || null;
    if (store_name !== undefined)     updates.store_name = store_name?.trim() || null;
    if (payment_method !== undefined) updates.payment_method = payment_method || null;
    if (expense_date !== undefined)   updates.expense_date = expense_date || null;
    if (currency !== undefined)       updates.currency = currency || 'EUR';
    if (req.body.paid_by !== undefined) updates.paid_by = Number(req.body.paid_by);

    await expense.update(updates);

    // Si un nouveau partage est fourni, on remplace entièrement les anciennes parts
    if (split_type !== undefined) {
      await ExpenseSplit.destroy({ where: { expense_id: expense.id } });
      await createSplits(expense, split_type, participants, custom_shares, expense.paid_by);
    }

    const updated = await Expense.findByPk(expense.id, {
      include: [paidByInclude, { model: ExpenseSplit, as: 'splits' }],
    });
    res.json(updated);
  } catch (error) {
    console.error('Erreur update expense:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// DELETE /api/expenses/:id
exports.delete = async (req, res) => {
  try {
    const household_id = req.householdId;

    const expense = await Expense.findOne({
      where: { id: req.params.id, household_id, deleted_at: null },
      include: [{ model: ExpenseSplit, as: 'splits' }],
    });
    if (!expense) return res.status(404).json({ message: 'Dépense non trouvée' });

    // Trace anti-fraude : on garde une copie complète de la dépense avant suppression
    await AuditLog.create({
      user_id: req.user.id,
      household_id,
      action: 'delete_expense',
      entity_type: 'Expense',
      entity_id: String(expense.id),
      old_values: JSON.stringify(expense.toJSON()),
    });

    await expense.update({ deleted_at: new Date() });

    // Si on supprime un remboursement, on rouvre automatiquement les dettes qu'il avait réglées
    // (sans ça, la dette resterait marquée "réglée" alors que la preuve de paiement n'existe plus)
    if (expense.category === 'Remboursement') {
      const reopened = await ExpenseSplit.update(
        { settled: false, settled_at: null, settled_by: null, settled_via_expense_id: null },
        { where: { settled_via_expense_id: expense.id } }
      );

      if (reopened[0] > 0) {
        await AuditLog.create({
          user_id: req.user.id,
          household_id,
          action: 'reopen_debt',
          entity_type: 'Expense',
          entity_id: String(expense.id),
          old_values: JSON.stringify({ label: expense.label, amount: expense.amount, splits_reopened: reopened[0] }),
        });
      }
    }

    res.json({ message: 'Dépense supprimée' });
  } catch (error) {
    console.error('Erreur delete expense:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/expenses/balances — qui doit quoi à qui (façon Tricount)
// ─────────────────────────────────────────────────────────────────
exports.getBalances = async (req, res) => {
  try {
    const household_id = req.householdId;
    const membersMap = await getHouseholdMembersMap(household_id);

    // 1. Dépenses ACTIVES du foyer uniquement (les supprimées sont explicitement exclues ici)
    const activeExpenses = await Expense.findAll({
      where: { household_id, deleted_at: null },
      attributes: ['id', 'paid_by'],
    });
    const activeExpenseIds = activeExpenses.map((e) => e.id);
    const payerByExpenseId = {};
    activeExpenses.forEach((e) => { payerByExpenseId[e.id] = e.paid_by; });

    // 2. Parts non réglées, filtrées explicitement sur ces dépenses actives uniquement
    const splits = activeExpenseIds.length > 0
      ? await ExpenseSplit.findAll({
          where: { settled: false, expense_id: { [Op.in]: activeExpenseIds } },
        })
      : [];

    // Balance nette par membre : positif = on lui doit de l'argent, négatif = il doit de l'argent
    const balances = {};
    Object.keys(membersMap).forEach((id) => { balances[id] = 0; });

    splits.forEach((split) => {
      const payer = payerByExpenseId[split.expense_id];
      const ower = split.user_id;
      if (!payer || ower === payer) return;
      balances[ower] = Math.round(((balances[ower] || 0) - split.share_amount) * 100) / 100;
      balances[payer] = Math.round(((balances[payer] || 0) + split.share_amount) * 100) / 100;
    });

    // Simplification en transactions minimales (algorithme glouton classique)
    const creditors = [];
    const debtors = [];
    Object.entries(balances).forEach(([user_id, amount]) => {
      if (amount > 0.01) creditors.push({ user_id: Number(user_id), amount });
      else if (amount < -0.01) debtors.push({ user_id: Number(user_id), amount: -amount });
    });
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const transactions = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.round(Math.min(debtor.amount, creditor.amount) * 100) / 100;
      if (amount > 0) {
        transactions.push({
          from: membersMap[debtor.user_id] || { id: debtor.user_id, name: 'Inconnu' },
          to: membersMap[creditor.user_id] || { id: creditor.user_id, name: 'Inconnu' },
          amount,
        });
      }
      debtor.amount = Math.round((debtor.amount - amount) * 100) / 100;
      creditor.amount = Math.round((creditor.amount - amount) * 100) / 100;
      if (debtor.amount <= 0.01) i++;
      if (creditor.amount <= 0.01) j++;
    }

    res.json({
      balances: Object.entries(balances).map(([user_id, amount]) => ({
        user: membersMap[user_id] || { id: Number(user_id), name: 'Inconnu' },
        amount,
      })),
      transactions,
    });
  } catch (error) {
    console.error('Erreur getBalances:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// POST /api/expenses/settle — marquer une relation comme réglée
// body: { user_a, user_b } — user_a (le débiteur) rembourse user_b (le créancier)
// ─────────────────────────────────────────────────────────────────
exports.settleBetween = async (req, res) => {
  try {
    const household_id = req.householdId;
    const { user_a, user_b } = req.body;
    if (!user_a || !user_b) return res.status(400).json({ message: 'user_a et user_b sont requis' });

    // Dépenses ACTIVES uniquement (les supprimées sont explicitement exclues ici)
    const activeExpenses = await Expense.findAll({
      where: { household_id, deleted_at: null },
      attributes: ['id', 'paid_by'],
    });
    const activeExpenseIds = activeExpenses.map((e) => e.id);
    const payerByExpenseId = {};
    activeExpenses.forEach((e) => { payerByExpenseId[e.id] = e.paid_by; });

    const splits = activeExpenseIds.length > 0
      ? await ExpenseSplit.findAll({
          where: {
            settled: false,
            user_id: { [Op.in]: [user_a, user_b] },
            expense_id: { [Op.in]: activeExpenseIds },
          },
        })
      : [];

    const toSettle = splits.filter((s) => {
      const payer = payerByExpenseId[s.expense_id];
      const ower = s.user_id;
      return (payer === Number(user_a) && ower === Number(user_b)) ||
             (payer === Number(user_b) && ower === Number(user_a));
    });

    // Montant net réellement remboursé par user_a à user_b sur ces dépenses précises
    let netAmount = 0;
    toSettle.forEach((s) => {
      const payer = payerByExpenseId[s.expense_id];
      if (payer === Number(user_b)) {
        netAmount += s.share_amount; // user_b a payé, user_a lui doit sa part
      } else {
        netAmount -= s.share_amount; // user_a a payé, ça compense dans l'autre sens
      }
    });
    netAmount = Math.round(netAmount * 100) / 100;

    // Créer la dépense "Remboursement" D'ABORD, pour pouvoir lier les parts réglées à elle
    let reimbursement = null;
    if (netAmount > 0) {
      const debtor = await User.findByPk(user_a, { attributes: ['id', 'name'] });
      const creditor = await User.findByPk(user_b, { attributes: ['id', 'name'] });

      reimbursement = await Expense.create({
        household_id,
        paid_by: Number(user_a),
        amount: netAmount,
        currency: 'EUR',
        label: `Remboursement à ${creditor?.name || 'un membre'}`,
        category: 'Remboursement',
        expense_date: new Date(),
      });

      await AuditLog.create({
        user_id: req.user.id,
        household_id,
        action: 'settle_debt',
        entity_type: 'Expense',
        entity_id: String(reimbursement.id),
        new_values: JSON.stringify({ from: debtor?.name, to: creditor?.name, amount: netAmount }),
      });
    }

    // Marquer les parts comme réglées, en les liant au remboursement créé
    await Promise.all(toSettle.map((s) => s.update({
      settled: true,
      settled_at: new Date(),
      settled_by: req.user.id,
      settled_via_expense_id: reimbursement?.id || null,
    })));

    res.json({
      message: `${toSettle.length} dépense(s) marquée(s) comme réglée(s)`,
      reimbursement,
    });
  } catch (error) {
    console.error('Erreur settleBetween:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/expenses/audit-log — historique des suppressions et règlements
// (anti-fraude : permet de voir qui a supprimé/réglé quoi et quand)
// ─────────────────────────────────────────────────────────────────
exports.getAuditLog = async (req, res) => {
  try {
    const household_id = req.householdId;
    const membersMap = await getHouseholdMembersMap(household_id);

    const logs = await AuditLog.findAll({
      where: { household_id, entity_type: 'Expense' },
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    const enriched = logs.map((l) => ({
      ...l.toJSON(),
      user: membersMap[l.user_id] || null,
    }));

    res.json(enriched);
  } catch (error) {
    console.error('Erreur getAuditLog:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};