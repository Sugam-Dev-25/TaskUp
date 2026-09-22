const jwt = require('jsonwebtoken');
const config = require('../config/config');

function protect(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    if (decoded.type && decoded.type !== 'access') {
      return res.status(401).json({ message: 'Not authorized, wrong token type' });
    }
    req.user = { _id: decoded.sub || decoded.id, role: decoded.role };
    if (!req.user._id) {
      return res.status(401).json({ message: 'Not authorized, token missing subject' });
    }
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token failed or expired' });
  }
}

module.exports = { protect };