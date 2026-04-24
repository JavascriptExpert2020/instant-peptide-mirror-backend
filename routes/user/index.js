const router = require("express").Router();
const { authenticateToken } = require("../../middleware/authMiddleware");
const {
  userHome,
  getProfile,
  updateProfile,
  listOrders,
  downloadInvoice,
  recordCoaDownload,
  listDownloads,
  createOrder,
} = require("../../controllers/user/userController");

router.get("/", userHome);
router.get("/me", authenticateToken, getProfile);
router.put("/me", authenticateToken, updateProfile);
router.get("/orders", authenticateToken, listOrders);
router.get("/orders/:orderNumber/invoice", authenticateToken, downloadInvoice);
router.post("/downloads", authenticateToken, recordCoaDownload);
router.get("/downloads", authenticateToken, listDownloads);
router.post("/orders", authenticateToken, createOrder);

module.exports = router;
