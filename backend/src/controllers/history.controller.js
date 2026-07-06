const { AuditLog, User } = require('../models');

const ENTITY_LABELS = {
  product: 'Produit',
  recipe: 'Recette',
  household: 'Foyer',
  household_member: 'Membre du foyer',
};

const ALLOWED_ENTITY_TYPES = Object.keys(ENTITY_LABELS);

// GET /api/history
exports.getAll = async (req, res) => {
  try {
    const household_id = req.householdId;
    const { entity_type, limit = 100 } = req.query;

    const where = { household_id };
    if (entity_type) {
      if (!ALLOWED_ENTITY_TYPES.includes(entity_type)) {
        return res.status(400).json({ message: `Type invalide. Valeurs autorisées : ${ALLOWED_ENTITY_TYPES.join(', ')}` });
      }
      where.entity_type = entity_type;
    }

    const logs = await AuditLog.findAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
      order: [['created_at', 'DESC']],
      limit: Math.min(parseInt(limit, 10) || 100, 500),
    });

    res.json(
      logs.map((log) => ({
        id: log.id,
        action: log.action,
        entity_type: log.entity_type,
        entity_label: ENTITY_LABELS[log.entity_type] || log.entity_type,
        entity_id: log.entity_id,
        old_values: log.old_values ? JSON.parse(log.old_values) : null,
        new_values: log.new_values ? JSON.parse(log.new_values) : null,
        user: log.user ? { id: log.user.id, name: log.user.name, email: log.user.email } : null,
        created_at: log.created_at,
      }))
    );
  } catch (error) {
    console.error('Erreur getAll history:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
