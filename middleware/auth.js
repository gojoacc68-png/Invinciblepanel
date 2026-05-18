const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

/**
 * Verify JWT token and return decoded payload.
 * Throws if token is missing, invalid, or expired.
 */
function verifyToken(token) {
  if (!token) {
    throw { status: 401, message: 'No token provided' };
  }
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw { status: 401, message: 'Token expired' };
    }
    throw { status: 401, message: 'Invalid token' };
  }
}

/**
 * Extract Bearer token from Authorization header.
 */
function extractToken(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Middleware factory — requires one of the given roles.
 * Usage: requireAuth(['owner', 'admin'])(req, res, next)
 */
function requireAuth(allowedRoles = ['owner', 'admin', 'user']) {
  return function(req, res, next) {
    try {
      const token = extractToken(req);
      const decoded = verifyToken(token);

      if (!allowedRoles.includes(decoded.role)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          required: allowedRoles,
          current: decoded.role
        });
      }

      req.user = decoded;
      next();
    } catch (err) {
      return res.status(err.status || 401).json({
        success: false,
        error: err.message || 'Unauthorized'
      });
    }
  };
}

/**
 * CORS preflight handler — call at the top of every API route.
 */
function handleCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

/**
 * Validate API key for machine-to-machine requests.
 */
function validateApiKey(req, res) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    res.status(401).json({ success: false, error: 'API key required' });
    return false;
  }
  // In production, validate against DB. This is a placeholder structure.
  if (!apiKey.startsWith('inv_')) {
    res.status(401).json({ success: false, error: 'Invalid API key format' });
    return false;
  }
  return true;
}

module.exports = { verifyToken, extractToken, requireAuth, handleCors, validateApiKey };
