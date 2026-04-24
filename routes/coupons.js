const router = require("express").Router();
const { validateCoupon } = require("../controllers/couponsController");

router.get("/validate", validateCoupon);

module.exports = router;
