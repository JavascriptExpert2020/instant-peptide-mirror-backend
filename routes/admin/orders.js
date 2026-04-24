const router = require('express').Router();
const { authenticateToken, requireAdmin } = require('../../middleware/authMiddleware');
const { listOrders, updateOrder } = require('../../controllers/admin/ordersController');

router.use(authenticateToken, requireAdmin);
router.get('/', listOrders);
router.put('/:id', updateOrder);

module.exports = router;
