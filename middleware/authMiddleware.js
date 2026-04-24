const jwt = require('jsonwebtoken');
const { User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'instant-peptide-dev-secret';

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const headerToken = req.headers['x-access-token'] || req.headers['x-auth-token'] || null;
  const queryToken = req.query.token || null;
  const token = bearerToken || headerToken || queryToken;

  if (!token) {
    return res.status(401).json({ message: 'Authentication token is required.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(payload.id);

    if (!user) {
      return res.status(401).json({ message: 'Invalid authentication token.' });
    }

    if (user.status === 'banned') {
      return res.status(403).json({ message: 'You have been banned.' });
    }

    req.user = user;
    req.token = token;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired authentication token.' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }

  return next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
};
