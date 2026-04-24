const router = require('express').Router();
const { authenticateToken, requireAdmin } = require('../../middleware/authMiddleware');
const { listPayments } = require('../../controllers/admin/paymentsController');

router.use(authenticateToken, requireAdmin);
router.get('/', listPayments);

module.exports = router;
