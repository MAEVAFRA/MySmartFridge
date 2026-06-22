const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const householdMiddleware = require('../middlewares/household.middleware');

router.use(authMiddleware);
router.use(householdMiddleware);

router.get('/', statsController.getSummary);
router.get('/export', statsController.exportCsv);

module.exports = router;
