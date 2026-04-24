const router = require('express').Router();
const {
  signup,
  signin,
  me,
  validateToken,
  forgotPassword,
  verifyPasswordResetOtp,
  resetPassword,
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/signin', signin);
router.post('/forgot-password', forgotPassword);
router.post('/forgot-password/verify-otp', verifyPasswordResetOtp);
router.post('/forgot-password/reset', resetPassword);
router.get('/me', authenticateToken, me);
router.get('/validate-token', authenticateToken, validateToken);

module.exports = router;
