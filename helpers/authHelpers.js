const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'instant-peptide-dev-secret';

const sanitizeUser = (user) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone,
  dateOfBirth: user.dateOfBirth,
  companyName: user.companyName,
  businessType: user.businessType,
  billingAddress: user.billingAddress,
  shippingAddress: user.shippingAddress,
  newsletterOptIn: user.newsletterOptIn,
  role: user.role,
  status: user.status,
  ordersCount: user.ordersCount,
  totalSpent: user.totalSpent,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const createToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

module.exports = {
  sanitizeUser,
  createToken,
};
