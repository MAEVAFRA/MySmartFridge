const { AuditLog } = require('../models');

// Enregistre une entrée d'historique (ajout/modification/suppression) pour le foyer, les produits ou les recettes.
async function logAudit(req, { action, entity_type, entity_id, old_values, new_values, household_id }) {
  try {
    await AuditLog.create({
      user_id: req.user?.id || null,
      household_id: household_id ?? req.householdId ?? null,
      action,
      entity_type,
      entity_id: entity_id != null ? String(entity_id) : null,
      old_values: old_values ? JSON.stringify(old_values) : null,
      new_values: new_values ? JSON.stringify(new_values) : null,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    });
  } catch (error) {
    // L'historique ne doit jamais faire échouer l'action principale
    console.error('Erreur logAudit:', error);
  }
}

module.exports = { logAudit };
