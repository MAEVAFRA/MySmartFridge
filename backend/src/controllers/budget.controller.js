const { fn, col, Op } = require('sequelize');
const { Expense, ExpenseCategoryBudget } = require('../models');

// Bornes (from, to) du mois "YYYY-MM" (ou mois courant si absent/invalide).
const monthBounds = (month) => {
  let year, m;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    [year, m] = month.split('-').map(Number);
  } else {
    const now = new Date();
    year = now.getFullYear();
    m = now.getMonth() + 1;
  }
  const pad = (n) => String(n).padStart(2, '0');
  const lastDay = new Date(year, m, 0).getDate();
  return { from: `${year}-${pad(m)}-01`, to: `${year}-${pad(m)}-${pad(lastDay)}`, label: `${year}-${pad(m)}` };
};

const clampAlert = (value) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 1 && n <= 100 ? n : 80;
};

const parsePositive = (value) => {
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// GET /api/budgets?month=YYYY-MM
// Renvoie, pour chaque budget de catégorie, le montant dépensé du mois,
// le pourcentage consommé et un statut (ok / warning / over).
exports.getSummary = async (req, res) => {
  try {
    const household_id = req.householdId;
    const { from, to, label } = monthBounds(req.query.month);

    const budgets = await ExpenseCategoryBudget.findAll({
      where: { household_id },
      order: [['category', 'ASC']],
    });

    // Dépenses agrégées par catégorie sur le mois
    const rows = await Expense.findAll({
      attributes: ['category', [fn('SUM', col('amount')), 'spent']],
      where: { household_id, deleted_at: null, expense_date: { [Op.gte]: from, [Op.lte]: to } },
      group: ['category'],
      raw: true,
    });

    const spentByCategory = {};
    let totalSpent = 0;
    for (const r of rows) {
      const spent = parseFloat(r.spent) || 0;
      if (r.category) spentByCategory[r.category] = spent;
      totalSpent += spent;
    }

    const items = budgets.map((b) => {
      const spent = spentByCategory[b.category] || 0;
      const percent = b.monthly_limit > 0 ? Math.round((spent / b.monthly_limit) * 100) : 0;
      let status = 'ok';
      if (spent > b.monthly_limit) status = 'over';
      else if (percent >= b.alert_at_percent) status = 'warning';
      return {
        id: b.id,
        category: b.category,
        monthly_limit: b.monthly_limit,
        alert_at_percent: b.alert_at_percent,
        spent,
        percent,
        status,
      };
    });

    const totalBudget = budgets.reduce((s, b) => s + (b.monthly_limit || 0), 0);

    res.json({ month: label, items, total_spent: totalSpent, total_budget: totalBudget });
  } catch (error) {
    console.error('Erreur getSummary budgets:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST /api/budgets - Définit (ou met à jour) le budget mensuel d'une catégorie.
exports.upsert = async (req, res) => {
  try {
    const household_id = req.householdId;
    const { category, monthly_limit, alert_at_percent } = req.body;

    if (!category || !category.trim()) {
      return res.status(400).json({ message: 'La catégorie est requise' });
    }
    const limit = parsePositive(monthly_limit);
    if (limit === null) {
      return res.status(400).json({ message: 'Le budget doit être un nombre positif' });
    }
    const alert = clampAlert(alert_at_percent);
    const cat = category.trim();

    const existing = await ExpenseCategoryBudget.findOne({ where: { household_id, category: cat } });
    if (existing) {
      await existing.update({ monthly_limit: limit, alert_at_percent: alert });
      return res.json(existing);
    }
    const budget = await ExpenseCategoryBudget.create({
      household_id, category: cat, monthly_limit: limit, alert_at_percent: alert,
    });
    res.status(201).json(budget);
  } catch (error) {
    console.error('Erreur upsert budget:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// DELETE /api/budgets/:id - Supprime un budget de catégorie.
exports.remove = async (req, res) => {
  try {
    const household_id = req.householdId;
    const budget = await ExpenseCategoryBudget.findOne({
      where: { id: req.params.id, household_id },
    });
    if (!budget) return res.status(404).json({ message: 'Budget non trouvé' });

    await budget.destroy();
    res.json({ message: 'Budget supprimé' });
  } catch (error) {
    console.error('Erreur remove budget:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
