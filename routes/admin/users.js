const router = require('express').Router();
const { authenticateToken, requireAdmin } = require('../../middleware/authMiddleware');
const { listUsers, updateUser } = require('../../controllers/admin/usersController');

router.use(authenticateToken, requireAdmin);
router.get('/', listUsers);
router.put('/:id', updateUser);

module.exports = router;
