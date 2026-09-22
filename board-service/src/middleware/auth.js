const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * Verifies the access token issued by the user-service
 * (jwt.sign({ sub: userId, type: 'access', role }, JWT_SECRET_KEY, ...)).
 *
 * Board-service has no local users table, so req.user is just the token
 * claims — { _id, role } — not a full DB record. Anywhere this service
 * needs profile data (name/email) to display, it calls out to the
 * user-service via src/utils/userClient.js instead.
 */
function protect(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  let bearer = scheme === 'Bearer' ? token : null;
  if (!bearer && req.cookies) {
    bearer = req.cookies.authToken || null;
  }

  if (!bearer) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(bearer, config.jwt.secret);
    if (decoded.type && decoded.type !== 'access') {
      return res.status(401).json({ message: 'Not authorized, wrong token type' });
    }
    req.user = {
      _id: decoded.sub || decoded.id,
      role: decoded.role,
    };
    if (!req.user._id) {
      return res.status(401).json({ message: 'Not authorized, token missing subject' });
    }
    next();
  } catch (error) {
    console.error('Auth token error:', error.message);
    return res.status(401).json({ message: 'Not authorized, token failed or expired' });
  }
}

function hasAdminPrivileges(req, res, next) {
  if (req.user && (req.user.role === 'manager' || req.user.role === 'ceo')) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Admin privileges required' });
}

module.exports = { protect, hasAdminPrivileges };
