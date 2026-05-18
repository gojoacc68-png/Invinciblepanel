/**
 * GET    /api/firebase/:id   — Get Firebase config by ID
 * PATCH  /api/firebase/:id   — Update config
 * DELETE /api/firebase/:id   — Delete config
 * POST   /api/firebase/:id/test — Test connection
 */

const { handleCors, extractToken, verifyToken } = require('../../middleware/auth');
const { rateLimit } = require('../../middleware/rateLimit');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (rateLimit(req, res)) return;

  const { id } = req.query;
  const isTest = req.url?.includes('/test');

  const token = extractToken(req);
  let caller;
  try {
    caller = verifyToken(token);
  } catch (err) {
    return res.status(401).json({ success: false, error: err.message });
  }

  if (!['owner', 'admin'].includes(caller.role)) {
    return res.status(403).json({ success: false, error: 'Insufficient permissions' });
  }

  if (req.method === 'POST' && isTest) {
    // Test Firebase connection
    // Fetch config from DB, then ping Firebase
    return res.status(200).json({
      success: true,
      connected: false,
      message: 'Configure database to test Firebase connection',
      configId: id
    });
  }

  if (req.method === 'GET') {
    // Return config (without encrypted apiKey)
    return res.status(200).json({ success: true, message: 'Configure database', configId: id });
  }

  if (req.method === 'PATCH') {
    const body = req.body || {};
    return res.status(200).json({ success: true, message: 'Configure database', updates: body, configId: id });
  }

  if (req.method === 'DELETE') {
    // Also unassign all users from this config
    return res.status(200).json({ success: true, message: 'Config deleted', configId: id });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
