const { Op } = require("sequelize");
const { Payment, Order, Coupon, sequelize } = require("../../models");
const { enrichOrderRecord, toNumber } = require("../../helpers/orderItemHelpers");

const listPayments = async (req, res) => {
  try {
    const paymentTable = await sequelize.getQueryInterface().describeTable("payments");
    const payments = await Payment.findAll({
      attributes: Object.keys(paymentTable),
      order: [["createdAt", "DESC"]],
    });

    const orderNumbers = [
      ...new Set(
        payments
          .map((payment) => payment.orderNumber)
          .filter((value) => value !== undefined && value !== null && value !== ""),
      ),
    ];

    const orders = orderNumbers.length
      ? await Order.findAll({
          where: { orderNumber: { [Op.in]: orderNumbers } },
        })
      : [];

    const orderMap = orders.reduce((acc, order) => {
      acc[order.orderNumber] = enrichOrderRecord(order);
      return acc;
    }, {});

    const couponCodes = [
      ...new Set(
        orders
          .map((order) => order.couponCode)
          .filter((value) => value !== undefined && value !== null && value !== ""),
      ),
    ];

    const coupons = couponCodes.length
      ? await Coupon.findAll({
          where: { code: { [Op.in]: couponCodes } },
        })
      : [];

    const couponMap = coupons.reduce((acc, coupon) => {
      acc[String(coupon.code)] = coupon;
      return acc;
    }, {});

    const normalizedPayments = payments.map((payment) => {
      const plainPayment = typeof payment?.get === "function" ? payment.get({ plain: true }) : { ...(payment || {}) };
      const linkedOrder = orderMap[plainPayment.orderNumber];
      const linkedCoupon = linkedOrder?.couponCode ? couponMap[String(linkedOrder.couponCode)] : null;
      const couponRate =
        linkedCoupon && String(linkedCoupon.type || "percentage").toLowerCase() === "percentage"
          ? toNumber(linkedCoupon.value)
          : 0;
      const volumeRates = linkedOrder
        ? [...new Set((linkedOrder.items || []).map((item) => toNumber(item.volumeDiscountRate)).filter((rate) => rate > 0))]
        : [];

      return {
        ...plainPayment,
        couponDiscount: linkedOrder ? toNumber(linkedOrder.couponDiscount) : toNumber(plainPayment.discount),
        couponRate,
        volumeRates,
        order: linkedOrder || null,
      };
    });

    return res.json({ payments: normalizedPayments });
  } catch (error) {
    console.log("Error loading payments", error);
    return res.status(500).json({ message: "Unable to load payments." });
  }
};

module.exports = {
  listPayments,
};
