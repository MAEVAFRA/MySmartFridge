const path = require('path');
const fs = require('fs');
const Tesseract = require('tesseract.js');
const { ReceiptScan, ReceiptScanItem, HouseholdMember } = require('../models');

const getHouseholdId = async (userId) => {
  const member = await HouseholdMember.findOne({ where: { user_id: userId } });
  if (!member) throw new Error('Aucun foyer trouvé');
  return member.household_id;
};

const MONTH_NAMES = {
  janvier: '01', février: '02', fevrier: '02', mars: '03', avril: '04',
  mai: '05', juin: '06', juillet: '07', août: '08', aout: '08',
  septembre: '09', octobre: '10', novembre: '11', décembre: '12', decembre: '12',
};

const SKIP_KEYWORDS = [
  'total', 'tva', 'avoir', 'rendu', 'espece', 'carte', 'visa', 'cb',
  'siret', 'tel', 'naf', 'tua', 'couvert', 'france', 'caisse',
  'bienvenue', 'merci', 'ticket n', 'positif', 'sous-total', 'sous total',
];

const parseReceiptText = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // ─── Magasin ────────────────────────────────────────────────────
  let storeName = null;
  const storeKeywords = ['carrefour', 'leclerc', 'lidl', 'aldi', 'intermarche', 'monoprix',
    'casino', 'franprix', 'super u', 'simply', 'netto', 'picard', 'brasserie', 'restaurant'];
  for (const line of lines.slice(0, 5)) {
    const lower = line.toLowerCase();
    if (storeKeywords.some(k => lower.includes(k))) { storeName = line; break; }
  }
  if (!storeName && lines.length > 0) storeName = lines[0];

  // ─── Total ──────────────────────────────────────────────────────
  let totalAmount = null;
  const totalRegex = /total[^\d]*(\d{1,4}[,.]\d{2})/i;
  for (const line of lines) {
    const match = line.match(totalRegex);
    if (match) { totalAmount = parseFloat(match[1].replace(',', '.')); break; }
  }

  // ─── Date — format numérique JJ/MM/AAAA ────────────────────────
  let purchaseDate = null;
  const dateRegex = /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{2,4})/;
  for (const line of lines) {
    const match = line.match(dateRegex);
    if (match) {
      const day = match[1], month = match[2];
      const year = match[3].length === 2 ? `20${match[3]}` : match[3];
      const parsed = new Date(`${year}-${month}-${day}`);
      if (!isNaN(parsed.getTime())) { purchaseDate = `${year}-${month}-${day}`; break; }
    }
  }

  // ─── Date — format textuel "Mardi 20 novembre" (sans année) ───
  if (!purchaseDate) {
    const textDateRegex = /(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)/i;
    for (const line of lines) {
      const match = line.match(textDateRegex);
      if (match) {
        const day = match[1].padStart(2, '0');
        const month = MONTH_NAMES[match[2].toLowerCase()];
        const year = new Date().getFullYear();
        purchaseDate = `${year}-${month}-${day}`;
        break;
      }
    }
  }

  // ─── Articles ───────────────────────────────────────────────────
  // Format A : points de suite "Nom du produit . . . . . . 14,90 €"
  const dotLeaderRegex = /^(.+?)[\s.]{2,}(\d{1,4}[,.]\d{2})\s*€?\s*$/;
  // Format B : quantité préfixée "1x NOM 10.00 €" (tickets restaurant/autres)
  const quantityPrefixRegex = /^\d+x?\s+(.+?)\s+(\d{1,4}[,.]\d{2})\s*€?\s*$/i;

  const items = [];
  for (const line of lines) {
    if (SKIP_KEYWORDS.some(s => line.toLowerCase().includes(s))) continue;

    let name = null, price = null;

    let m = line.match(dotLeaderRegex);
    if (m) {
      name = m[1].trim();
      price = parseFloat(m[2].replace(',', '.'));
    } else {
      m = line.match(quantityPrefixRegex);
      if (m) {
        name = m[1].trim();
        price = parseFloat(m[2].replace(',', '.'));
      }
    }

    if (name) {
      // Nettoyer les points de suite résiduels et espaces
      name = name.replace(/[.\s]+$/, '').trim();
    }

    // Filtrer les faux positifs : noms trop courts, purement numériques, ou prix incohérent
    const isPlausible = name && price != null && name.length > 1 && !/^\d+$/.test(name) && price > 0 && price < 1000;

    if (isPlausible) {
      items.push({ name, quantity: 1, unit: 'unité', unit_price: price, total_price: price, status: 'pending' });
    }
  }

  return { storeName, totalAmount, purchaseDate, items };
};

exports.scan = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Image manquante' });
  try {
    const household_id = await getHouseholdId(req.user.id);
    const { data: { text, confidence } } = await Tesseract.recognize(req.file.path, 'fra', { logger: () => {} });
    fs.unlinkSync(req.file.path);
    const parsed = parseReceiptText(text);
    const scan = await ReceiptScan.create({
      household_id,
      scanned_by: req.user.id,
      store_name: parsed.storeName,
      total_amount: parsed.totalAmount,
      scanned_at: parsed.purchaseDate || new Date(),
      status: 'processed',
      ocr_confidence: confidence,
      raw_ocr_text: text,
    });
    if (parsed.items.length > 0) {
      await ReceiptScanItem.bulkCreate(parsed.items.map(item => ({ ...item, scan_id: scan.id })));
    }
    const fullScan = await ReceiptScan.findByPk(scan.id, {
      include: [{ model: ReceiptScanItem, as: 'items' }],
    });
    res.status(201).json({ scan: fullScan, parsed, rawText: text });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Erreur scan:', error);
    res.status(500).json({ message: 'Erreur lors du scan', error: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const household_id = await getHouseholdId(req.user.id);
    const scans = await ReceiptScan.findAll({
      where: { household_id },
      include: [{ model: ReceiptScanItem, as: 'items' }],
      order: [['created_at', 'DESC']],
    });
    res.json(scans);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const household_id = await getHouseholdId(req.user.id);
    const scan = await ReceiptScan.findOne({
      where: { id: req.params.id, household_id },
      include: [{ model: ReceiptScanItem, as: 'items' }],
    });
    if (!scan) return res.status(404).json({ message: 'Ticket introuvable' });
    res.json(scan);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const household_id = await getHouseholdId(req.user.id);
    const scan = await ReceiptScan.findOne({ where: { id: req.params.id, household_id } });
    if (!scan) return res.status(404).json({ message: 'Ticket introuvable' });
    await scan.destroy();
    res.json({ message: 'Ticket supprimé' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};