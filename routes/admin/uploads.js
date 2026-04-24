const router = require('express').Router();
const { authenticateToken, requireAdmin } = require('../../middleware/authMiddleware');
const upload = require('../../middleware/adminUpload');
const { uploadFile } = require('../../controllers/admin/uploadController');

router.use(authenticateToken, requireAdmin);
router.post('/file', upload.single('file'), uploadFile);

module.exports = router;
