const router = require('express').Router();
const { authenticateToken, requireAdmin } = require('../../middleware/authMiddleware');
const {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../../controllers/admin/productsController');

router.use(authenticateToken, requireAdmin);
router.get('/', listProducts);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;
