const path = require('path');
const fs = require('fs');
const Tesseract = require('tesseract.js');
const { ReceiptScan, ReceiptScanItem, HouseholdMember } = require('../models');

const getHouseholdId = async (userId) => {
  const member = await HouseholdMember.findOne({ where: { user_id: userId } });
  if (!member) throw new Error('Aucun foyer trouvé');
  return member.household_id;
};

const parseReceiptText = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  let storeName = null;
  const storeKeywords = ['carrefour', 'leclerc', 'lidl', 'aldi', 'intermarche', 'monoprix',
    'casino', 'franprix', 'super u', 'simply', 'netto', 'picard', 'brasserie', 'restaurant'];
  for (const line of lines.slice(0, 5)) {
    const lower = line.toLowerCase();
    if (storeKeywords.some(k => lower.includes(k))) { storeName = line; break; }
  }
  if (!storeName && lines.length > 0) storeName = lines[0];

  let totalAmount = null;
  const totalRegex = /total[^\d]*(\d+[,\.]\d{2})/i;
  for (const line of lines) {
    const match = line.match(totalRegex);
    if (match) { totalAmount = parseFloat(match[1].replace(',', '.')); break; }
  }

  let purchaseDate = null;
  const dateRegex = /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{2,4})/;
  for (const line of lines) {
    const match = line.match(dateRegex);
    if (match) {
      const day = match[1], month = match[2];
      const year = match[3].length === 2 ? `20${match[3]}` : match[3];
      const parsed = new Date(`${year}-${month}-${day}`);
      purchaseDate = isNaN(parsed.getTime()) ? null : `${year}-${month}-${day}`;
      break;
    }
  }

  const items = [];
  const skip = ['total', 'tva', 'avoir', 'rendu', 'espece', 'carte', 'visa', 'cb',
    'siret', 'tel', 'naf', 'tua', 'couvert', 'france'];

  const format1 = /^\d+x?\s+(.+?)\s+(\d+[,\.]\d{2})\s*€?\s*$/i;
  const format2 = /^([A-ZÀ-Ü][A-ZÀ-Üa-zà-ü\s\-]+)\s{2,}(\d+[,\.]\d{2})\s*€?\s*$/;

  for (const line of lines) {
    if (skip.some(s => line.toLowerCase().includes(s))) continue;
    let name = null, price = null;
    const m1 = line.match(format1);
    if (m1) { name = m1[1].trim(); price = parseFloat(m1[2].replace(',', '.')); }
    if (!name) {
      const m2 = line.match(format2);
      if (m2) { name = m2[1].trim(); price = parseFloat(m2[2].replace(',', '.')); }
    }
    if (name && price && name.length > 2) {
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