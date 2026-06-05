const { Location, Product, ProductCategory, HouseholdMember } = require('../models');

const getHouseholdId = async (userId) => {
  const member = await HouseholdMember.findOne({ where: { user_id: userId } });
  if (!member) throw new Error('Aucun foyer trouvé pour cet utilisateur');
  return member.household_id;
};

exports.getAll = async (req, res) => {
  try {
    const household_id = await getHouseholdId(req.user.id);
    const locations = await Location.findAll({
      where: { household_id, deleted_at: null },
      order: [['display_order', 'ASC']],
    });
    res.json(locations);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const household_id = await getHouseholdId(req.user.id);
    const location = await Location.findOne({
      where: { id: req.params.id, household_id, deleted_at: null },
      include: [{
        model: Product, as: 'products',
        where: { household_id, deleted_at: null }, required: false,
        include: [{ model: ProductCategory, as: 'category' }],
      }],
    });
    if (!location) return res.status(404).json({ message: 'Emplacement non trouvé' });
    res.json(location);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const household_id = await getHouseholdId(req.user.id);
    const { name, type, icon, color } = req.body;
    if (!name) return res.status(400).json({ message: 'Le nom est obligatoire' });
    const count = await Location.count({ where: { household_id, deleted_at: null } });
    const location = await Location.create({
      household_id, name,
      type:  type  || 'other',
      icon:  icon  || '📦',
      color: color || '#6b7280',
      display_order: count,
    });
    res.status(201).json(location);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const household_id = await getHouseholdId(req.user.id);
    const location = await Location.findOne({
      where: { id: req.params.id, household_id, deleted_at: null },
    });
    if (!location) return res.status(404).json({ message: 'Emplacement non trouvé' });
    const { name, type, icon, color } = req.body;
    await location.update({ name, type, icon, color });
    res.json(location);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const household_id = await getHouseholdId(req.user.id);
    const location = await Location.findOne({
      where: { id: req.params.id, household_id, deleted_at: null },
    });
    if (!location) return res.status(404).json({ message: 'Emplacement non trouvé' });
    await location.update({ deleted_at: new Date() });
    res.json({ message: 'Emplacement supprimé' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};