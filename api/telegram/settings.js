/**
 * GET   /api/telegram/settings   — Get Telegram bot configuration
 * PATCH /api/telegram/settings   — Update Telegram bot configuration
 *
 * Owner-only endpoint.
 */

const { handleCors, extractToken, verifyToken } = require('../../middleware/auth');
const { rateLimit } = require('../../middleware/rateLimit');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (rateLimit(req, res)) return;

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
    // Return masked bot token, webhook URL, OTP settings
    // const { sql } = require('@vercel/postgres');
    // const result = await sql`SELECT * FROM system_settings WHERE key LIKE 'telegram_%'`;
    // ─────────────────────────────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      settings: {
        botUsername: null,
        webhookUrl: null,
        otpExpirySeconds: parseInt(process.env.OTP_EXPIRY_SECONDS || '120', 10),
        maxOtpAttempts: parseInt(process.env.MAX_OTP_ATTEMPTS || '5', 10),
        otpLength: 6,
        otpMessageTemplate: '🔐 *INVINCIBLE PANEL*\n\nYour OTP: `{OTP}`\nValid for {EXPIRY} seconds.',
        isConfigured: !!process.env.TELEGRAM_BOT_TOKEN
      }
    });
  }

  if (req.method === 'PATCH') {
    const { botToken, webhookUrl, otpExpirySeconds, maxOtpAttempts, otpMessageTemplate } = req.body || {};

    // Validate bot token format if provided
    if (botToken && !/^\d+:[A-Za-z0-9_-]{35,}$/.test(botToken)) {
      return res.status(400).json({ success: false, error: 'Invalid Telegram bot token format' });
    }

    // ── REPLACE WITH YOUR DATABASE / ENV UPDATE LOGIC ─────────────────────
    // Store encrypted bot token in DB or update Vercel env via Vercel API
    // ─────────────────────────────────────────────────────────────────────

    return res.status(200).json({
      success: true,
      message: 'Settings updated. Note: TELEGRAM_BOT_TOKEN must be set in Vercel environment variables.'
    });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
