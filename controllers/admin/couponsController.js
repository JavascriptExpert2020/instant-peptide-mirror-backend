const { Coupon } = require("../../models");

const listCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.findAll({ order: [["createdAt", "DESC"]] });
    return res.json({ coupons });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load coupons." });
  }
};

const createCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.create(req.body || {});
    return res.status(201).json({ coupon });
  } catch (error) {
    return res.status(500).json({ message: "Unable to create coupon." });
  }
};

const updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByPk(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found." });
    }

    await coupon.update(req.body || {});
    return res.json({ coupon });
  } catch (error) {
    return res.status(500).json({ message: "Unable to update coupon." });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const deleted = await Coupon.destroy({ where: { id: req.params.id } });
    if (!deleted) {
      return res.status(404).json({ message: "Coupon not found." });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: "Unable to delete coupon." });
  }
};

module.exports = {
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
};
