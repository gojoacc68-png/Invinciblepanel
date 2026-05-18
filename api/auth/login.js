/**
 * POST /api/auth/login
 * 
 * Step 1 of login: validate username + password, then trigger Telegram OTP.
 * 
 * Body: { username: string, password: string }
 * Returns: { success, sessionToken, telegramUsername, message }
 *
 * Setup required:
 *   - Set ADMIN_DB_URL (your database connection string)
 *   - Set TELEGRAM_BOT_TOKEN
 *   - Set JWT_SECRET
 *   - Set ENCRYPTION_KEY (32-byte hex string)
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { handleCors } = require('../../middleware/auth');
const { rateLimit } = require('../../middleware/rateLimit');

const JWT_SECRET = process.env.JWT_SECRET;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const OTP_EXPIRY = parseInt(process.env.OTP_EXPIRY_SECONDS || '120', 10);

if (!JWT_SECRET || !ENCRYPTION_KEY) {
  throw new Error('JWT_SECRET and ENCRYPTION_KEY environment variables are required');
}

/**
 * Hash a password using SHA-256 + salt.
 * In production, use bcrypt — this is lightweight for serverless cold starts.
 */
function hashPassword(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

/**
 * Generate a 6-digit OTP and store it with expiry.
 * In production, store in Redis/KV store instead of JWT.
 */
function generateOtpPayload(userId, username, role) {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpToken = jwt.sign(
    {
      type: 'otp_pending',
      userId,
      username,
      role,
      otp: crypto.createHmac('sha256', ENCRYPTION_KEY).update(otp).digest('hex'),
      exp: Math.floor(Date.now() / 1000) + OTP_EXPIRY
    },
    JWT_SECRET
  );
  return { otp, otpToken };
}

/**
 * Send OTP via Telegram Bot API.
 */
async function sendTelegramOtp(telegramId, otp, username) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN not configured');

  const message = `🔐 *INVINCIBLE PANEL*\n\nYour OTP code: \`${otp}\`\n\nValid for ${OTP_EXPIRY} seconds.\nRequested for: @${username}\n\n⚠️ Never share this code.`;

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: telegramId,
      text: message,
      parse_mode: 'Markdown'
    })
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description}`);
  }
  return data;
}

/**
 * Fetch user from database by username.
 * Replace this function body with your actual DB queries.
 */
async function getUserFromDb(username) {
  // ── REPLACE WITH YOUR DATABASE LOGIC ──────────────────────────────────────
  // Example using Vercel Postgres / Neon / PlanetScale:
  //
  // const { sql } = require('@vercel/postgres');
  // const result = await sql`
  //   SELECT id, username, password_hash, password_salt, role, telegram_id,
  //          is_active, expires_at
  //   FROM users WHERE username = ${username} AND is_active = true
  //   LIMIT 1
  // `;
  // return result.rows[0] || null;
  //
  // ─────────────────────────────────────────────────────────────────────────
  throw new Error('Database not configured. Implement getUserFromDb() in /api/auth/login.js');
}

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (rateLimit(req, res, 10)) return;

  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    if (typeof username !== 'string' || username.length > 64) {
      return res.status(400).json({ success: false, error: 'Invalid username format' });
    }

    const user = await getUserFromDb(username.toLowerCase().trim());

    if (!user) {
      await new Promise(r => setTimeout(r, 200 + Math.random() * 100));
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    if (user.expires_at && new Date(user.expires_at) < new Date()) {
      return res.status(403).json({ success: false, error: 'Account has expired' });
    }

    const hashedInput = hashPassword(password, user.password_salt);
    if (hashedInput !== user.password_hash) {
      await new Promise(r => setTimeout(r, 200 + Math.random() * 100));
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    if (!user.telegram_id) {
      return res.status(400).json({
        success: false,
        error: 'No Telegram ID linked to this account. Contact your administrator.'
      });
    }

    const { otp, otpToken } = generateOtpPayload(user.id, user.username, user.role);

    await sendTelegramOtp(user.telegram_id, otp, user.username);

    return res.status(200).json({
      success: true,
      sessionToken: otpToken,
      telegramUsername: user.telegram_username || null,
      message: `OTP sent to your linked Telegram account`,
      expiresIn: OTP_EXPIRY
    });

  } catch (err) {
    console.error('[/api/auth/login]', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
