const { Op } = require("sequelize");
const { Order, Coupon } = require("../../models");
const { enrichOrders, enrichOrderRecord } = require("../../helpers/orderItemHelpers");

const attachCouponRate = async (orders) => {
  const couponCodes = [
    ...new Set(
      orders
        .map((order) => order.couponCode)
        .filter((value) => value !== undefined && value !== null && value !== ""),
    ),
  ];

  if (couponCodes.length === 0) {
    return orders;
  }

  const coupons = await Coupon.findAll({
    where: { code: { [Op.in]: couponCodes } },
  });

  const couponMap = coupons.reduce((acc, coupon) => {
    acc[String(coupon.code)] = coupon;
    return acc;
  }, {});

  return orders.map((order) => {
    const coupon = order.couponCode ? couponMap[String(order.couponCode)] : null;
    const couponRate =
      coupon && String(coupon.type || "percentage").toLowerCase() === "percentage"
        ? Number(coupon.value) || 0
        : 0;

    return {
      ...order,
      couponRate,
    };
  });
};

const listOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({ order: [["createdAt", "DESC"]] });
    const enrichedOrders = await enrichOrders(orders);
    return res.json({ orders: await attachCouponRate(enrichedOrders) });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load orders." });
  }
};

const updateOrder = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    await order.update({
      status: req.body?.status || order.status,
      shippingAddress: req.body?.shippingAddress ?? order.shippingAddress,
    });

    const [updatedOrder] = await attachCouponRate([enrichOrderRecord(order)]);
    return res.json({ order: updatedOrder });
  } catch (error) {
    return res.status(500).json({ message: "Unable to update order." });
  }
};

module.exports = {
  listOrders,
  updateOrder,
};
