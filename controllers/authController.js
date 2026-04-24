const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { User } = require("../models");
const { sanitizeUser, createToken } = require("../helpers/authHelpers");
const { sendEmail } = require("../helpers/sendEmail");
const {
  enrichOrderRecord,
  renderOrderItemsHtml,
  toNumber,
} = require("../helpers/orderItemHelpers");

const passwordResetStore = new Map();
const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;

const createPasswordResetOtp = () => String(crypto.randomInt(100000, 999999));

const buildAdminSignupEmail = (user) => `
  <h2>New registration received</h2>
  <p>A new user created an account on the site.</p>
  <ul>
    <li><strong>Name:</strong> ${user.firstName} ${user.lastName}</li>
    <li><strong>Email:</strong> ${user.email}</li>
    <li><strong>Phone:</strong> ${user.phone || "N/A"}</li>
    <li><strong>Company:</strong> ${user.companyName || "N/A"}</li>
    <li><strong>Business type:</strong> ${user.businessType || "N/A"}</li>
  </ul>
`;

const buildOrderEmail = (order, user) => {
  const enrichedOrder = enrichOrderRecord(order);

  return `
  <h2>New order placed</h2>
  <p><strong>Order #:</strong> ${enrichedOrder.orderNumber}</p>
  <p><strong>Customer:</strong> ${user.firstName} ${user.lastName}</p>
  <p><strong>Email:</strong> ${user.email}</p>
  <p><strong>Items subtotal:</strong> $${toNumber(enrichedOrder.itemsSubtotal).toFixed(2)}</p>
  <p><strong>Coupon discount:</strong> -$${toNumber(enrichedOrder.couponDiscount).toFixed(2)}</p>
  <p><strong>Volume discount:</strong> -$${toNumber(enrichedOrder.volumeDiscount).toFixed(2)}</p>
  <p><strong>Total discount:</strong> -$${toNumber(enrichedOrder.totalDiscount).toFixed(2)}</p>
  <p><strong>Total:</strong> $${toNumber(enrichedOrder.finalTotal ?? enrichedOrder.total).toFixed(2)}</p>
  <p><strong>Status:</strong> ${enrichedOrder.status}</p>
  ${renderOrderItemsHtml(enrichedOrder.items)}
`;
};

const buildOtpEmail = (otp) => `
  <h2>Password reset OTP</h2>
  <p>Use the following code to reset your password:</p>
  <p style="font-size:24px;font-weight:700;letter-spacing:4px;">${otp}</p>
  <p>This code expires in 15 minutes.</p>
`;

const signup = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      dateOfBirth,
      companyName,
      businessType,
      newsletterOptIn = false,
    } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        message: "firstName, lastName, email, and password are required.",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({ message: "Email is already registered." });
    }

    const user = await User.create({
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      email: normalizedEmail,
      password,
      phone: phone ? String(phone).trim() : null,
      dateOfBirth: dateOfBirth || null,
      companyName: companyName ? String(companyName).trim() : null,
      businessType: businessType ? String(businessType).trim() : null,
      newsletterOptIn: Boolean(newsletterOptIn),
    });

    try {
      await sendEmail({
        subject: `New registration: ${user.email}`,
        html: buildAdminSignupEmail(user),
        to: process.env.ADMIN_EMAIL,
      });
    } catch (emailError) {
      console.warn("Signup notification email failed:", emailError.message);
    }

    const token = createToken(user);

    return res.status(201).json({
      message: "Account created successfully.",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.log("Error creating user", error);
    return res.status(500).json({
      message: "Unable to create account.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "email and password are required.",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ where: { email: normalizedEmail } });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (user.status === "banned") {
      return res.status(403).json({ message: "You have been banned." });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = createToken(user);

    return res.status(200).json({
      message: "Signed in successfully.",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.log("Error during signin", error);
    return res.status(500).json({
      message: "Unable to sign in.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const me = async (req, res) => {
  return res.status(200).json({
    user: sanitizeUser(req.user),
  });
};

const validateToken = async (req, res) => {
  return res.status(200).json({
    valid: true,
    token: req.token,
    user: sanitizeUser(req.user),
  });
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      return res
        .status(404)
        .json({ message: "No account found for this email." });
    }

    const otp = createPasswordResetOtp();
    passwordResetStore.set(normalizedEmail, {
      otp,
      expiresAt: Date.now() + PASSWORD_RESET_TTL_MS,
      verified: false,
    });

    await sendEmail({
      subject: "Your password reset code",
      html: buildOtpEmail(otp),
      to: normalizedEmail,
    });

    return res.status(200).json({ message: "OTP sent to your email." });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to send password reset OTP.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const verifyPasswordResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    const submittedOtp = String(otp || "").trim();

    const record = passwordResetStore.get(normalizedEmail);

    if (!record || record.expiresAt < Date.now()) {
      passwordResetStore.delete(normalizedEmail);
      return res
        .status(400)
        .json({ message: "OTP has expired or is invalid." });
    }

    if (record.otp !== submittedOtp) {
      return res.status(400).json({ message: "OTP is invalid." });
    }

    passwordResetStore.set(normalizedEmail, { ...record, verified: true });

    return res.status(200).json({ message: "OTP verified successfully." });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to verify OTP.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    const nextPassword = String(password || "");
    const nextConfirm = String(confirmPassword || "");

    if (!normalizedEmail || !nextPassword || !nextConfirm) {
      return res.status(400).json({
        message: "Email, password, and confirmPassword are required.",
      });
    }

    if (nextPassword !== nextConfirm) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    const record = passwordResetStore.get(normalizedEmail);
    if (!record || !record.verified || record.expiresAt < Date.now()) {
      passwordResetStore.delete(normalizedEmail);
      return res.status(400).json({ message: "OTP verification is required." });
    }

    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      return res
        .status(404)
        .json({ message: "No account found for this email." });
    }

    await user.update({ password: nextPassword });
    passwordResetStore.delete(normalizedEmail);

    return res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to reset password.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  signup,
  signin,
  me,
  validateToken,
  forgotPassword,
  verifyPasswordResetOtp,
  resetPassword,
};
