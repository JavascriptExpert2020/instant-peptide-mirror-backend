const router = require('express').Router();
const { adminHome } = require('../../controllers/admin/adminController');
const { authenticateToken, requireAdmin } = require('../../middleware/authMiddleware');

const products = require('./products');
const orders = require('./orders');
const payments = require('./payments');
const users = require('./users');
const coupons = require('./coupons');
const uploads = require('./uploads');

router.get('/', authenticateToken, requireAdmin, adminHome);
router.use('/products', products);
router.use('/orders', orders);
router.use('/payments', payments);
router.use('/users', users);
router.use('/coupons', coupons);
router.use('/', uploads);

module.exports = router;
