const { HouseholdMember } = require('../models');

/**
 * Middleware qui résout le household_id de l'utilisateur connecté.
 * Priority :
 *   1. Header X-Household-Id (si présent et que l'utilisateur est membre)
 *   2. Premier foyer de l'utilisateur (fallback, comportement legacy)
 * Injecte req.householdId dans la requête.
 */
module.exports = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const headerHouseholdId = req.headers['x-household-id'];

    if (headerHouseholdId) {
      const member = await HouseholdMember.findOne({
        where: {
          user_id: userId,
          household_id: headerHouseholdId,
        },
      });

      if (member) {
        req.householdId = parseInt(headerHouseholdId, 10);
        return next();
      }
      // Si le header est fourni mais invalide, on ne fait pas de fallback silencieux
      return res.status(403).json({
        message: 'Vous n\'êtes pas membre de ce foyer ou le foyer n\'existe pas',
      });
    }

    // Fallback : premier foyer de l'utilisateur
    const member = await HouseholdMember.findOne({
      where: { user_id: userId },
      order: [['joined_at', 'ASC']],
    });

    if (!member) {
      return res.status(404).json({ message: 'Aucun foyer trouvé pour cet utilisateur' });
    }

    req.householdId = member.household_id;
    next();
  } catch (error) {
    console.error('Erreur household middleware:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};
