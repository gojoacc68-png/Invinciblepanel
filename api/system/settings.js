/**
 * GET   /api/system/settings   — Get system-wide settings
 * PATCH /api/system/settings   — Update system settings
 *
 * Owner-only endpoint.
 */

const { handleCors, extractToken, verifyToken } = require('../../middleware/auth');
const { rateLimit } = require('../../middleware/rateLimit');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (rateLimit(req, res, 30)) return;

  const token = extractToken(req);
  let caller;
  try {
    caller = verifyToken(token);
  } catch (err) {
    return res.status(401).json({ success: false, error: err.message });
  }

  if (caller.role !== 'owner') {
    return res.status(403).json({ success: false, error: 'Owner access required' });
  }

  if (req.method === 'GET') {
    // ── REPLACE WITH YOUR DATABASE LOGIC ──────────────────────────────────
    // const { sql } = require('@vercel/postgres');
    // const result = await sql`SELECT key, value FROM system_settings`;
    // const settings = Object.fromEntries(result.rows.map(r => [r.key, r.value]));
    // ─────────────────────────────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      settings: {
        panelName: 'INVINCIBLE PANEL',
        sessionTimeoutHours: parseInt(process.env.SESSION_EXPIRY_HOURS || '24', 10),
        otpExpirySeconds: parseInt(process.env.OTP_EXPIRY_SECONDS || '120', 10),
        maxOtpAttempts: parseInt(process.env.MAX_OTP_ATTEMPTS || '5', 10),
        rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
        rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
        enforce2FA: true,
        ipWhitelist: [],
        allowedRoles: ['owner', 'admin', 'user'],
        maintenanceMode: false
      }
    });
  }

  if (req.method === 'PATCH') {
    const allowed = [
      'panelName', 'sessionTimeoutHours', 'otpExpirySeconds',
      'maxOtpAttempts', 'enforce2FA', 'ipWhitelist', 'maintenanceMode'
    ];
    const body = req.body || {};
    const updates = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    // Validate
    if (updates.sessionTimeoutHours !== undefined &&
        (updates.sessionTimeoutHours < 1 || updates.sessionTimeoutHours > 720)) {
      return res.status(400).json({ success: false, error: 'sessionTimeoutHours must be 1-720' });
    }

    // ── REPLACE WITH YOUR DATABASE LOGIC ──────────────────────────────────
    // Upsert each key-value pair in system_settings table
    // ─────────────────────────────────────────────────────────────────────

    return res.status(200).json({ success: true, message: 'Settings updated', updates });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
