const { Op } = require("sequelize");
const { Order, Payment, Download, Product, Coupon, sequelize } = require("../../models");
const { sendEmail } = require("../../helpers/sendEmail");
const { sanitizeUser } = require("../../helpers/authHelpers");
const {
  enrichOrderRecord,
  enrichOrders,
  renderOrderItemsHtml,
  summarizeOrderItems,
  toNumber,
} = require("../../helpers/orderItemHelpers");

const pickString = (value) => (typeof value === "string" ? value.trim() : "");

const normalizeAddress = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const firstName = pickString(value.firstName);
  const lastName = pickString(value.lastName);
  const companyName = pickString(value.companyName);
  const line1 = pickString(value.line1 || value.address || value.address1);
  const line2 = pickString(value.line2 || value.apartment || value.address2);
  const city = pickString(value.city);
  const state = pickString(value.state);
  const zip = pickString(value.zip || value.postalCode || value.postal);
  const country = pickString(value.country) || "United States";
  const phone = pickString(value.phone);

  if (!firstName && !lastName && !line1 && !city && !state && !zip && !companyName) {
    return null;
  }

  return {
    firstName,
    lastName,
    companyName,
    line1,
    line2,
    city,
    state,
    zip,
    country,
    phone,
  };
};

const formatAddress = (address) => {
  if (!address) {
    return "";
  }

  if (typeof address === "string") {
    return address.trim();
  }

  const lines = [
    [pickString(address.firstName), pickString(address.lastName)].filter(Boolean).join(" "),
    pickString(address.companyName),
    pickString(address.line1 || address.address || address.address1),
    pickString(address.line2 || address.apartment || address.address2),
    [pickString(address.city), [pickString(address.state), pickString(address.zip || address.postalCode || address.postal)].filter(Boolean).join(" ")].filter(Boolean).join(", "),
    pickString(address.country),
  ].filter(Boolean);

  return lines.join(", ");
};

const buildProductMap = async (orders) => {
  const productIds = new Set();

  for (const order of orders || []) {
    for (const item of Array.isArray(order?.items) ? order.items : []) {
      if (item?.productId !== undefined && item?.productId !== null && item?.productId !== "") {
        productIds.add(String(item.productId));
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
    attributes: ["id", "name", "coaUrl"],
  });

  return products.reduce((acc, product) => {
    acc[String(product.id)] = product.get({ plain: true });
    return acc;
  }, {});
};

const matchesUserOrder = (order, user) => {
  const orderEmail = pickString(order?.email).toLowerCase();
  const userEmail = pickString(user?.email).toLowerCase();
  if (String(order?.userId ?? "") === String(user?.id ?? "")) {
    return true;
  }

  if (orderEmail && userEmail && orderEmail === userEmail) {
    return true;
  }

  const orderCustomer = pickString(order?.customer).toLowerCase();
  const fullName = [pickString(user?.firstName), pickString(user?.lastName)].filter(Boolean).join(" ").toLowerCase();
  const companyName = pickString(user?.companyName).toLowerCase();

  return Boolean(
    (fullName && orderCustomer.includes(fullName)) ||
      (companyName && orderCustomer.includes(companyName)),
  );
};

const sanitizePdfText = (value) =>
  String(value ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/[^\x20-\x7E]/g, "?");

const escapePdfText = (value) =>
  sanitizePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const wrapPdfLines = (value, maxLength = 84) => {
  const words = sanitizePdfText(value).split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [""];
  }

  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
      continue;
    }

    current = next;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
};

const buildInvoicePages = (order) => {
  const couponRate = Number(order.couponRate ?? 0);
  const couponPercent = couponRate > 0 ? couponRate : Number(order.itemsSubtotal) > 0
    ? (Number(order.couponDiscount ?? 0) / Number(order.itemsSubtotal)) * 100
    : 0;

  const lines = [
    `Invoice # ${order.orderNumber}`,
    `Customer: ${order.customer}`,
    `Email: ${order.email}`,
    `Date: ${order.date}`,
    `Status: ${order.status}`,
    `Shipping Address: ${formatAddress(order.shippingAddress) || "Not provided"}`,
    `Coupon: ${order.couponCode ? `${order.couponCode}${couponPercent > 0 ? ` (${couponPercent.toFixed(0)}% off)` : ""}` : "None"}`,
    "",
    "Items",
    "Product | Qty | Unit | Total",
    ...order.items.flatMap((item) => {
      const title = `${item.name} | ${item.quantity} | $${Number(item.unitPrice ?? item.price ?? 0).toFixed(2)} | $${Number(item.discountedSubtotal ?? item.lineSubtotal ?? item.price * item.quantity).toFixed(2)}`;
      return wrapPdfLines(title, 92);
    }),
    "",
    `Items subtotal: $${Number(order.itemsSubtotal ?? order.total).toFixed(2)}`,
    `Coupon discount: -${couponPercent > 0 ? `${couponPercent.toFixed(0)}%` : `$${Number(order.couponDiscount ?? 0).toFixed(2)}`}`,
    `Volume discount: -$${Number(order.volumeDiscount ?? 0).toFixed(2)}`,
    `Final total: $${Number(order.finalTotal ?? order.total).toFixed(2)}`,
  ];

  const pages = [];
  const chunkSize = 26;
  for (let i = 0; i < lines.length; i += chunkSize) {
    pages.push(lines.slice(i, i + chunkSize));
  }

  return pages.length > 0 ? pages : [["No invoice data available."]];
};

const buildPdfBuffer = (title, pages) => {
  const parts = [];
  const offsets = [];
  let byteLength = 0;

  const push = (chunk) => {
    parts.push(chunk);
    byteLength += Buffer.byteLength(chunk, "utf8");
  };

  const addObject = (objectNumber, body) => {
    offsets[objectNumber] = byteLength;
    push(`${objectNumber} 0 obj\n${body}\nendobj\n`);
  };

  push("%PDF-1.4\n");
  addObject(1, "<< /Type /Catalog /Pages 2 0 R >>");
  addObject(2, `<< /Type /Pages /Kids [${pages.map((_, index) => `${4 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  addObject(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  pages.forEach((pageLines, index) => {
    const pageObject = 4 + index * 2;
    const contentObject = pageObject + 1;
    const contentLines = [];
    const escapedTitle = escapePdfText(title);
    const header = pageLines[0] || "";

    contentLines.push("BT");
    contentLines.push("/F1 18 Tf");
    contentLines.push("50 770 Td");
    contentLines.push(`(${escapePdfText(header || escapedTitle)}) Tj`);
    contentLines.push("ET");

    contentLines.push("BT");
    contentLines.push("/F1 10 Tf");
    contentLines.push("50 740 Td");
    contentLines.push("13 TL");
    pageLines.slice(1).forEach((line, lineIndex) => {
      contentLines.push(lineIndex === 0 ? `(${escapePdfText(line)}) Tj` : `T* (${escapePdfText(line)}) Tj`);
    });
    contentLines.push("ET");

    const contentStream = contentLines.join("\n");
    const contentBody = `<< /Length ${Buffer.byteLength(contentStream, "utf8")} >>\nstream\n${contentStream}\nendstream`;
    addObject(contentObject, contentBody);
    addObject(
      pageObject,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObject} 0 R >>`,
    );
  });

  const xrefOffset = byteLength;
  let xref = `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    const offset = offsets[i] ?? 0;
    xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  push(xref);
  push(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return Buffer.from(parts.join(""), "utf8");
};

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

const buildOrderWhereClause = (user) => {
  const email = pickString(user.email).toLowerCase();
  const names = [
    [pickString(user.firstName), pickString(user.lastName)].filter(Boolean).join(" "),
    pickString(user.companyName),
  ]
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const orClauses = [];

  if (user.id !== undefined && user.id !== null) {
    orClauses.push({ userId: user.id });
  }

  if (email) {
    orClauses.push(sequelize.where(sequelize.fn("LOWER", sequelize.col("email")), email));
  }

  for (const name of names) {
    orClauses.push({ customer: { [Op.iLike]: `%${name}%` } });
  }

  return { [Op.or]: orClauses };
};

const getPaymentPayloadForSchema = async (payload) => {
  const table = await sequelize.getQueryInterface().describeTable("payments");
  const allowedKeys = new Set(Object.keys(table));

  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => allowedKeys.has(key)),
  );
};

const resolveDownloadProduct = async (body) => {
  const productId = pickString(body?.productId);
  const productSlug = pickString(body?.productSlug);
  const productName = pickString(body?.productName);

  const lookupOrder = [];
  if (productId) {
    lookupOrder.push({ id: productId });
  }
  if (productSlug) {
    lookupOrder.push({ slug: productSlug });
  }
  if (productName) {
    lookupOrder.push({ name: productName });
  }

  for (const where of lookupOrder) {
    const product = await Product.findOne({ where });
    if (product) {
      return product;
    }
  }

  return null;
};

const userHome = (req, res) => {
  res.status(200).json({ message: "User API is running" });
};

const getProfile = async (req, res) => {
  return res.status(200).json({
    user: sanitizeUser(req.user),
  });
};

const updateProfile = async (req, res) => {
  try {
    const body = req.body || {};
    const nextEmail = pickString(body.email).toLowerCase();
    const nextPassword = pickString(body.newPassword);
    const currentPassword = pickString(body.currentPassword);
    const confirmPassword = pickString(body.confirmPassword);

    if (nextEmail && nextEmail !== req.user.email) {
      const existingUser = await req.user.constructor.findOne({
        where: { email: nextEmail },
      });

      if (existingUser && String(existingUser.id) !== String(req.user.id)) {
        return res.status(409).json({ message: "Email is already registered." });
      }
    }

    if (nextPassword || currentPassword || confirmPassword) {
      if (!currentPassword || !nextPassword || !confirmPassword) {
        return res
          .status(400)
          .json({ message: "Current password, new password, and confirm password are required." });
      }

      if (nextPassword !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match." });
      }

      const bcrypt = require("bcryptjs");
      const isValidPassword = await bcrypt.compare(currentPassword, req.user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Current password is invalid." });
      }
    }

    const billingAddress = normalizeAddress(body.billingAddress);
    const shippingAddress = normalizeAddress(body.shippingAddress);

    await req.user.update({
      firstName: body.firstName !== undefined ? pickString(body.firstName) : req.user.firstName,
      lastName: body.lastName !== undefined ? pickString(body.lastName) : req.user.lastName,
      email: nextEmail || req.user.email,
      phone: body.phone !== undefined ? pickString(body.phone) : req.user.phone,
      dateOfBirth: body.dateOfBirth !== undefined ? body.dateOfBirth || null : req.user.dateOfBirth,
      companyName: body.companyName !== undefined ? pickString(body.companyName) || null : req.user.companyName,
      businessType: body.businessType !== undefined ? pickString(body.businessType) || null : req.user.businessType,
      newsletterOptIn:
        body.newsletterOptIn !== undefined ? Boolean(body.newsletterOptIn) : req.user.newsletterOptIn,
      billingAddress: billingAddress !== null ? billingAddress : req.user.billingAddress,
      shippingAddress: shippingAddress !== null ? shippingAddress : req.user.shippingAddress,
      password: nextPassword || req.user.password,
    });

    return res.status(200).json({
      message: "Account updated successfully.",
      user: sanitizeUser(req.user),
    });
  } catch (error) {
    console.log("Error updating user", error);
    return res.status(500).json({
      message: "Unable to update account.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const listOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: buildOrderWhereClause(req.user),
      order: [["createdAt", "DESC"]],
    });

    return res.json({ orders: await attachCouponRate(await enrichOrders(orders)) });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load orders." });
  }
};

const downloadInvoice = async (req, res) => {
  try {
    const orderNumber = pickString(req.params.orderNumber);
    if (!orderNumber) {
      return res.status(400).json({ message: "Order number is required." });
    }

    const order = await Order.findOne({ where: { orderNumber } });
    if (!order || !matchesUserOrder(order, req.user)) {
      return res.status(404).json({ message: "Order not found." });
    }

    const [enrichedOrder] = await attachCouponRate([enrichOrderRecord(order)]);
    const pages = buildInvoicePages(enrichedOrder);
    const pdfBuffer = buildPdfBuffer(`Invoice ${enrichedOrder.orderNumber}`, pages);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Invoice-${enrichedOrder.orderNumber}.pdf"`);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    return res.status(500).json({ message: "Unable to generate invoice PDF." });
  }
};

const recordCoaDownload = async (req, res) => {
  try {
    const product = await resolveDownloadProduct(req.body);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    if (!product.coaUrl) {
      return res.status(400).json({ message: "This product does not have a COA available." });
    }

    const record = await Download.create({
      userId: req.user.id,
      email: req.user.email,
      productId: String(product.id),
      productName: product.name,
      productSlug: product.slug,
      coaUrl: product.coaUrl,
      type: "coa",
    });

    return res.status(201).json({
      message: "COA download recorded.",
      download: {
        id: String(record.id),
        userId: record.userId,
        email: record.email,
        productId: record.productId,
        productName: record.productName,
        productSlug: record.productSlug,
        coaUrl: record.coaUrl,
        type: record.type,
        downloadedAt: record.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to record COA download." });
  }
};

const createOrder = async (req, res) => {
  try {
    if (req.user.status !== "active") {
      return res
        .status(403)
        .json({ message: "Inactive users cannot place orders." });
    }

    const body = req.body || {};
    const items = Array.isArray(body.items) ? body.items : [];
    const billingAddress = normalizeAddress(body.billingAddress);
    const shippingAddress = normalizeAddress(body.shippingAddress);

    if (items.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one item is required." });
    }

    const orderNumber = `VF-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
    const summary = summarizeOrderItems(items);
    const couponDiscount = Math.max(0, toNumber(body.couponDiscount ?? body.discount, 0));
    const volumeDiscount = summary.volumeDiscount;
    const totalDiscount = Number((couponDiscount + volumeDiscount).toFixed(2));
    const total = Math.max(0, toNumber(body.total, summary.itemsSubtotal - totalDiscount));
    const fee = Number((total * 0.029 + 0.3).toFixed(2));
    const net = Math.max(0, Number((total - fee).toFixed(2)));
    const paymentPayload = await getPaymentPayloadForSchema({
      orderNumber,
      customer:
        body.customer ||
        `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() ||
        req.user.email,
      email: body.email || req.user.email,
      amount: total,
      discount: totalDiscount,
      fee,
      net,
      method: body.paymentMethod || "visa",
      status: "succeeded",
      couponCode: body.couponCode || null,
      date: body.date || new Date(),
    });

    const order = await sequelize.transaction(async (transaction) => {
      const created = await Order.create(
        {
          orderNumber,
          userId: req.user.id,
          customer:
            body.customer ||
            `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() ||
            req.user.email,
          email: body.email || req.user.email,
          items,
          total,
          status: body.status || "pending",
          date: body.date || new Date(),
          shippingAddress: formatAddress(body.shippingAddress || body.shippingAddressText || ""),
          couponCode: body.couponCode || null,
          discount: couponDiscount || null,
        },
        { transaction },
      );

      const paymentRecord = {
        ...paymentPayload,
        customer: created.customer,
        email: created.email,
      };

      await Payment.create(paymentRecord, {
        transaction,
        fields: Object.keys(paymentRecord),
        returning: false,
      });

      await req.user.increment(
        { ordersCount: 1, totalSpent: total },
        { transaction },
      );

      if (billingAddress || shippingAddress) {
        await req.user.update(
          {
            billingAddress: billingAddress || req.user.billingAddress,
            shippingAddress: shippingAddress || req.user.shippingAddress,
          },
          { transaction },
        );
      }

      return created;
    });

    const enrichedOrder = enrichOrderRecord(order);

    try {
      await sendEmail({
        subject: `New order placed: ${enrichedOrder.orderNumber}`,
        html: `
          <h2>New order placed</h2>
          <p><strong>Order #:</strong> ${enrichedOrder.orderNumber}</p>
          <p><strong>Customer:</strong> ${enrichedOrder.customer}</p>
          <p><strong>Email:</strong> ${enrichedOrder.email}</p>
          <p><strong>Items subtotal:</strong> $${toNumber(enrichedOrder.itemsSubtotal).toFixed(2)}</p>
          <p><strong>Coupon discount:</strong> -$${toNumber(enrichedOrder.couponDiscount).toFixed(2)}</p>
          <p><strong>Volume discount:</strong> -$${toNumber(enrichedOrder.volumeDiscount).toFixed(2)}</p>
          <p><strong>Total discount:</strong> -$${toNumber(enrichedOrder.totalDiscount).toFixed(2)}</p>
          <p><strong>Total:</strong> $${toNumber(enrichedOrder.finalTotal ?? enrichedOrder.total).toFixed(2)}</p>
          ${renderOrderItemsHtml(enrichedOrder.items)}
        `,
        to: process.env.ADMIN_EMAIL,
      });
    } catch (emailError) {
      console.warn("Order notification email failed:", emailError.message);
    }

    return res.status(201).json({
      message: "Order created successfully.",
      order: enrichedOrder,
    });
  } catch (error) {
    console.log("Error creating order", error);
    return res.status(500).json({
      message: "Unable to create order.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const listDownloads = async (req, res) => {
  try {
    const downloads = await Download.findAll({
      where: {
        [Op.or]: [{ userId: req.user.id }, { email: req.user.email }],
      },
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      downloads: downloads.map((download) => {
        const plainDownload =
          typeof download?.get === "function" ? download.get({ plain: true }) : { ...(download || {}) };

        return {
          id: String(plainDownload.id ?? ""),
          type: String(plainDownload.type ?? "coa"),
          productId: String(plainDownload.productId ?? ""),
          productName: String(plainDownload.productName ?? ""),
          productSlug: plainDownload.productSlug ? String(plainDownload.productSlug) : undefined,
          coaUrl: plainDownload.coaUrl ? String(plainDownload.coaUrl) : undefined,
          downloadedAt: plainDownload.createdAt ? String(plainDownload.createdAt) : undefined,
        };
      }),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load downloads." });
  }
};

module.exports = {
  userHome,
  getProfile,
  updateProfile,
  listOrders,
  downloadInvoice,
  recordCoaDownload,
  listDownloads,
  createOrder,
};
