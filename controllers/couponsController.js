const { Coupon, sequelize } = require("../models");

const normalizeCode = (value) => String(value || "").trim().toUpperCase();

const calculateDiscount = (coupon, subtotal) => {
  const amount = Math.max(0, Number(subtotal) || 0);
  const couponValue = Math.max(0, Number(coupon.value) || 0);

  if (amount <= 0) return 0;
  if (String(coupon.type || "percentage").toLowerCase() === "fixed") {
    return Math.min(couponValue, amount);
  }

  return Math.min(amount, (amount * couponValue) / 100);
};

const validateCoupon = async (req, res) => {
  try {
    const code = normalizeCode(req.query.code);
    const subtotal = Math.max(0, Number(req.query.subtotal) || 0);

    if (!code) {
      return res.status(400).json({ message: "Coupon code is required." });
    }

    const coupon = await Coupon.findOne({
      where: sequelize.where(
        sequelize.fn("LOWER", sequelize.col("code")),
        code.toLowerCase()
      ),
    });

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found." });
    }

    if (!coupon.active) {
      return res.status(400).json({ message: "Coupon is inactive." });
    }

    if (coupon.expiresAt) {
      const expiresAt = new Date(`${coupon.expiresAt}T23:59:59.999Z`);
      if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
        return res.status(400).json({ message: "Coupon has expired." });
      }
    }

    if (Number(coupon.maxUses) > 0 && Number(coupon.usedCount) >= Number(coupon.maxUses)) {
      return res.status(400).json({ message: "Coupon usage limit reached." });
    }

    if (subtotal < Number(coupon.minOrder || 0)) {
      return res.status(400).json({
        message: `Minimum order for this coupon is $${Number(coupon.minOrder || 0).toFixed(2)}.`,
      });
    }

    const discount = calculateDiscount(coupon, subtotal);

    return res.json({
      coupon: coupon.toJSON(),
      discount,
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to validate coupon." });
  }
};

module.exports = {
  validateCoupon,
};
