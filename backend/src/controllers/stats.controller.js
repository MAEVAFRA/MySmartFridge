const { Product, ProductCategory, Location, ProductConsumptionLog } = require('../models');

// ─── Helpers ──────────────────────────────────────────────────────

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const num = (v) => (typeof v === 'number' && !isNaN(v) ? v : 0);

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// Nb de jours avant péremption (négatif = déjà périmé), null si pas de date.
const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - startOfToday()) / 86400000);
};

const expiryStatus = (dateStr) => {
  const d = daysUntil(dateStr);
  if (d === null) return 'Sans date';
  if (d < 0) return 'Périmé';
  if (d <= 3) return 'À consommer (≤3j)';
  if (d <= 7) return 'Bientôt (≤7j)';
  return 'OK';
};

// ─── GET /api/stats ───────────────────────────────────────────────
// Résumé statistique du foyer : valeur du stock, gaspillage, consommation,
// répartition par catégorie (camembert), par état de péremption et par mois (barres).

exports.getSummary = async (req, res) => {
  try {
    const household_id = req.householdId;

    const [products, logs] = await Promise.all([
      Product.findAll({
        where: { household_id, deleted_at: null },
        include: [{ model: ProductCategory, as: 'category', attributes: ['id', 'name', 'icon'] }],
      }),
      ProductConsumptionLog.findAll({ where: { household_id } }),
    ]);

    const priceOf = (p) => num(p.price);

    // ── Stock global ──
    const stockCount = products.length;
    const stockValue = products.reduce((s, p) => s + priceOf(p), 0);

    // ── Répartition par catégorie + par état de péremption ──
    const byExpiry = { expired: 0, soon3: 0, soon7: 0, later: 0, none: 0 };
    let expiredCount = 0;
    let expiredValue = 0;
    const catMap = new Map();

    for (const p of products) {
      const d = daysUntil(p.expires_at);
      if (d === null) byExpiry.none += 1;
      else if (d < 0) {
        byExpiry.expired += 1;
        expiredCount += 1;
        expiredValue += priceOf(p);
      } else if (d <= 3) byExpiry.soon3 += 1;
      else if (d <= 7) byExpiry.soon7 += 1;
      else byExpiry.later += 1;

      const name = p.category ? p.category.name : 'Sans catégorie';
      const icon = p.category ? p.category.icon : '📦';
      const cur = catMap.get(name) || { category: name, icon, count: 0, value: 0 };
      cur.count += 1;
      cur.value += priceOf(p);
      catMap.set(name, cur);
    }

    const byCategory = [...catMap.values()]
      .map((c) => ({ ...c, value: round2(c.value) }))
      .sort((a, b) => b.count - a.count);

    // ── Logs de consommation (consommé / jeté / périmé) ──
    // On compte les sorties enregistrées. On n'agrège pas de montant € ici :
    // le prix stocké n'est pas fiable « par unité » (quantités hétérogènes,
    // ex. grammes). Les € ne portent que sur le stock (somme de product.price).
    const countAction = (action) => logs.filter((l) => l.action === action).length;
    const consumedCount = countAction('consumed');
    const thrownCount = countAction('thrown');
    const expiredLoggedCount = countAction('expired');

    const wastedCount = thrownCount + expiredLoggedCount;
    const trackedCount = consumedCount + wastedCount;
    const wasteRate = trackedCount > 0 ? round2((wastedCount / trackedCount) * 100) : null;

    // ── Activité par mois (6 derniers mois) : consommé vs gaspillé ──
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        ym: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('fr-FR', { month: 'short' }),
        consumed: 0,
        wasted: 0,
      });
    }
    const idxByYm = new Map(months.map((m, i) => [m.ym, i]));
    for (const l of logs) {
      if (!l.logged_at) continue;
      const d = new Date(l.logged_at);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const idx = idxByYm.get(ym);
      if (idx === undefined) continue;
      if (l.action === 'consumed') months[idx].consumed += 1;
      else if (l.action === 'thrown' || l.action === 'expired') months[idx].wasted += 1;
    }

    res.json({
      stock: { count: stockCount, value: round2(stockValue) },
      waste: {
        expired_in_stock_count: expiredCount,
        expired_in_stock_value: round2(expiredValue),
        logged_thrown: thrownCount,
        logged_expired: expiredLoggedCount,
        rate: wasteRate, // % ou null si aucune sortie enregistrée
      },
      consumption: { count: consumedCount },
      byCategory,
      byExpiry,
      byMonth: months,
    });
  } catch (error) {
    console.error('Erreur stats getSummary:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ─── GET /api/stats/export ────────────────────────────────────────
// Export CSV de l'inventaire courant (séparateur « ; » + BOM pour Excel FR).

exports.exportCsv = async (req, res) => {
  try {
    const household_id = req.householdId;

    const products = await Product.findAll({
      where: { household_id, deleted_at: null },
      include: [
        { model: ProductCategory, as: 'category', attributes: ['name'] },
        { model: Location, as: 'location', attributes: ['name'] },
      ],
      order: [['expires_at', 'ASC NULLS LAST']],
    });

    const headers = ['Produit', 'Catégorie', 'Emplacement', 'Quantité', 'Unité', 'Péremption', 'Prix (€)', 'Statut'];
    const rows = products.map((p) => [
      p.name,
      p.category ? p.category.name : '',
      p.location ? p.location.name : '',
      p.quantity ?? '',
      p.unit ?? '',
      p.expires_at || '',
      p.price ?? '',
      expiryStatus(p.expires_at),
    ]);

    const esc = (v) => {
      const s = String(v ?? '');
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers, ...rows].map((r) => r.map(esc).join(';')).join('\r\n');
    const BOM = '﻿'; // pour qu'Excel ouvre l'UTF-8 correctement

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="mysmartfridge-inventaire.csv"');
    res.send(BOM + csv);
  } catch (error) {
    console.error('Erreur stats exportCsv:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
