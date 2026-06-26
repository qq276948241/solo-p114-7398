const jwt = require('jsonwebtoken');
const { JWT_SECRET, ROLES } = require('../config');
const { error } = require('../utils/response');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(error('未提供认证令牌', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json(error('认证令牌已过期', 401));
    }
    return res.status(401).json(error('无效的认证令牌', 401));
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(error('未登录', 401));
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json(error('权限不足', 403));
    }
    next();
  };
}

function requireAdmin(req, res, next) {
  return requireRole(ROLES.ADMIN)(req, res, next);
}

function requireKitchen(req, res, next) {
  return requireRole(ROLES.KITCHEN, ROLES.ADMIN)(req, res, next);
}

module.exports = {
  authenticate,
  requireRole,
  requireAdmin,
  requireKitchen
};
