const { Product } = require("../models");

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundMoney = (value) => Number(toNumber(value).toFixed(2));

const formatMoney = (value) => `$${toNumber(value).toFixed(2)}`;

const getQuantity = (item) => {
  const quantity = toNumber(
    item?.quantity ?? item?.qty ?? item?.count ?? item?.units,
    1,
  );
  return quantity > 0 ? quantity : 1;
};

const getUnitPrice = (item, quantity) => {
  const directPrice = item?.unitPrice ?? item?.price ?? item?.salePrice ?? item?.amount;
  if (directPrice !== undefined && directPrice !== null && directPrice !== "") {
    return Math.max(0, toNumber(directPrice));
  }

  const lineTotal = item?.total ?? item?.subtotal ?? item?.lineTotal;
  if (lineTotal !== undefined && lineTotal !== null && lineTotal !== "" && quantity > 0) {
    return Math.max(0, roundMoney(toNumber(lineTotal) / quantity));
  }

  return 0;
};

const resolveItemName = (item, productNameMap, index) => {
  const explicitName =
    item?.name ??
    item?.productName ??
    item?.title ??
    item?.label ??
    item?.description;

  if (explicitName) {
    return String(explicitName).trim();
  }

  const productKeyCandidates = [
    item?.productId,
    item?.product_id,
    item?.productID,
    item?.id,
    item?.sku,
    item?.slug,
  ];

  for (const candidate of productKeyCandidates) {
    if (candidate === undefined || candidate === null || candidate === "") {
      continue;
    }

    const resolved = productNameMap[String(candidate)];
    if (resolved) {
      return resolved;
    }
  }

  return `Item ${index + 1}`;
};

const calculateVolumeDiscountRate = (quantity) => {
  if (quantity >= 4) return 10;
  if (quantity >= 3) return 5;
  return 0;
};

const summarizeOrderItems = (items = [], productNameMap = {}) => {
  const normalizedItems = Array.isArray(items)
    ? items.map((item, index) => normalizeOrderItem(item, index, productNameMap))
    : [];

  const itemsSubtotal = roundMoney(
    normalizedItems.reduce((sum, item) => sum + toNumber(item.lineSubtotal), 0),
  );
  const volumeDiscount = roundMoney(
    normalizedItems.reduce((sum, item) => sum + toNumber(item.volumeDiscount), 0),
  );

  return {
    items: normalizedItems,
    itemsSubtotal,
    volumeDiscount,
  };
};

const normalizeOrderItem = (item, index, productNameMap = {}) => {
  const quantity = getQuantity(item);
  const unitPrice = getUnitPrice(item, quantity);
  const lineSubtotal = roundMoney(unitPrice * quantity);
  const volumeDiscountRate = calculateVolumeDiscountRate(quantity);
  const volumeDiscount = roundMoney((lineSubtotal * volumeDiscountRate) / 100);
  const lineTotal = roundMoney(lineSubtotal - volumeDiscount);
  const name = resolveItemName(item, productNameMap, index);

  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return {
      name,
      productName: name,
      title: name,
      qty: quantity,
      quantity,
      unitPrice,
      price: unitPrice,
      lineSubtotal,
      volumeDiscountRate,
      volumeDiscount,
      discountedSubtotal: lineTotal,
    };
  }

  return {
    ...item,
    name,
    productName: item.productName || name,
    title: item.title || name,
    qty: quantity,
    quantity,
    unitPrice,
    price: item.price !== undefined && item.price !== null && item.price !== "" ? item.price : unitPrice,
    lineSubtotal,
    volumeDiscountRate,
    volumeDiscount,
    discountedSubtotal: lineTotal,
  };
};

const buildProductNameMap = async (orders) => {
  const items = orders.flatMap((order) => (Array.isArray(order?.items) ? order.items : []));
  const productIds = new Set();

  for (const item of items) {
    const candidateIds = [
      item?.productId,
      item?.product_id,
      item?.productID,
      item?.id,
    ];

    for (const candidate of candidateIds) {
      if (candidate !== undefined && candidate !== null && candidate !== "") {
        productIds.add(String(candidate));
      }
    }
  }

  if (productIds.size === 0) {
    return {};
  }

  const products = await Product.findAll({
    where: {
      id: Array.from(productIds),
    },
    attributes: ["id", "name"],
  });

  return products.reduce((acc, product) => {
    acc[String(product.id)] = product.name;
    return acc;
  }, {});
};

const enrichOrderRecord = (order, productNameMap = {}) => {
  const plainOrder = typeof order?.get === "function" ? order.get({ plain: true }) : { ...(order || {}) };
  const summary = summarizeOrderItems(plainOrder.items, productNameMap);
  const couponDiscount = roundMoney(plainOrder.discount ?? 0);
  const totalDiscount = roundMoney(couponDiscount + summary.volumeDiscount);
  const totalAfterDiscount = roundMoney(summary.itemsSubtotal - totalDiscount);
  const shippingFee = roundMoney(plainOrder.shippingFee ?? 0);
  const deliveryGuaranteeFee = roundMoney(plainOrder.deliveryGuaranteeFee ?? 0);
  const tax = roundMoney(plainOrder.tax ?? 0);
  const finalTotalBeforeStored = roundMoney(totalAfterDiscount + shippingFee + deliveryGuaranteeFee + tax);
  const storedTotal = toNumber(plainOrder.total, totalAfterDiscount);

  return {
    ...plainOrder,
    items: summary.items,
    itemsSubtotal: summary.itemsSubtotal,
    couponDiscount,
    volumeDiscount: summary.volumeDiscount,
    totalDiscount,
    shippingFee,
    deliveryGuaranteeFee,
    tax,
    itemsTotalAfterVolumeDiscount: roundMoney(summary.itemsSubtotal - summary.volumeDiscount),
    calculatedTotal: finalTotalBeforeStored,
    finalTotal: storedTotal,
  };
};

const enrichOrders = async (orders) => {
  const productNameMap = await buildProductNameMap(orders);
  return orders.map((order) => enrichOrderRecord(order, productNameMap));
};

const renderOrderItemsHtml = (items) => {
  if (!items.length) {
    return "<p>No items found.</p>";
  }

  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0;">${item.name}</td>
          <td style="padding:8px 0;text-align:center;">${item.qty}</td>
          <td style="padding:8px 0;text-align:right;">$${toNumber(item.unitPrice).toFixed(2)}</td>
          <td style="padding:8px 0;text-align:right;">${item.volumeDiscountRate}%</td>
          <td style="padding:8px 0;text-align:right;">$${toNumber(item.volumeDiscount).toFixed(2)}</td>
          <td style="padding:8px 0;text-align:right;">$${toNumber(item.discountedSubtotal).toFixed(2)}</td>
        </tr>`,
    )
    .join("");

  return `
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px 0;border-bottom:1px solid #e5e7eb;">Item</th>
          <th style="text-align:center;padding:8px 0;border-bottom:1px solid #e5e7eb;">Qty</th>
          <th style="text-align:right;padding:8px 0;border-bottom:1px solid #e5e7eb;">Unit</th>
          <th style="text-align:right;padding:8px 0;border-bottom:1px solid #e5e7eb;">Discount</th>
          <th style="text-align:right;padding:8px 0;border-bottom:1px solid #e5e7eb;">Saved</th>
          <th style="text-align:right;padding:8px 0;border-bottom:1px solid #e5e7eb;">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};

const renderOrderFinancialSummaryHtml = (order) => {
  const rows = [
    ["Items subtotal", formatMoney(order.itemsSubtotal ?? order.total)],
    ["Volume discount", `-${formatMoney(order.volumeDiscount ?? 0).slice(1)}`],
    ["Coupon discount", `-${formatMoney(order.couponDiscount ?? 0).slice(1)}`],
    ["Shipping fee", formatMoney(order.shippingFee ?? 0)],
    ["Delivery guarantee", formatMoney(order.deliveryGuaranteeFee ?? 0)],
    ["Tax", formatMoney(order.tax ?? 0)],
    ["Total", formatMoney(order.finalTotal ?? order.total)],
  ];

  return `
    <table style="width:100%;border-collapse:collapse;margin-top:16px;">
      <tbody>
        ${rows
          .map(
            ([label, value], index) => `
              <tr>
                <td style="padding:8px 0;border-top:${index === 0 ? "1px solid #e5e7eb" : "none"};font-weight:${label === "Total" ? 700 : 400};">${label}</td>
                <td style="padding:8px 0;border-top:${index === 0 ? "1px solid #e5e7eb" : "none"};text-align:right;font-weight:${label === "Total" ? 700 : 400};">${value}</td>
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
};

module.exports = {
  enrichOrderRecord,
  enrichOrders,
  renderOrderFinancialSummaryHtml,
  renderOrderItemsHtml,
  summarizeOrderItems,
  toNumber,
};
