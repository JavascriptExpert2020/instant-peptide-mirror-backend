const router = require('express').Router();
const { authenticateToken, requireAdmin } = require('../../middleware/authMiddleware');
const {
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} = require('../../controllers/admin/couponsController');

router.use(authenticateToken, requireAdmin);
router.get('/', listCoupons);
router.post('/', createCoupon);
router.put('/:id', updateCoupon);
router.delete('/:id', deleteCoupon);

module.exports = router;
