/**
 * POST /api/auth/verify-otp
 *
 * Step 2 of login: verify the 6-digit OTP received on Telegram.
 * Returns a full JWT access token on success.
 *
 * Body: { sessionToken: string, otp: string }
 * Returns: { success, accessToken, user: { id, username, role, expiresAt } }
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { handleCors } = require('../../middleware/auth');
const { otpRateLimit } = require('../../middleware/rateLimit');

const JWT_SECRET = process.env.JWT_SECRET;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const SESSION_EXPIRY = parseInt(process.env.SESSION_EXPIRY_HOURS || '24', 10);

if (!JWT_SECRET || !ENCRYPTION_KEY) {
  throw new Error('JWT_SECRET and ENCRYPTION_KEY are required');
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (otpRateLimit(req, res)) return;

  try {
    const { sessionToken, otp } = req.body || {};

    if (!sessionToken || !otp) {
      return res.status(400).json({
        success: false,
        error: 'sessionToken and otp are required'
      });
    }

    const cleanOtp = String(otp).trim().replace(/\s/g, '');
    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({
        success: false,
        error: 'OTP must be a 6-digit number'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(sessionToken, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, error: 'OTP has expired. Please log in again.' });
      }
      return res.status(401).json({ success: false, error: 'Invalid session token' });
    }

    if (decoded.type !== 'otp_pending') {
      return res.status(400).json({ success: false, error: 'Invalid token type' });
    }

    const inputHash = crypto.createHmac('sha256', ENCRYPTION_KEY).update(cleanOtp).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(decoded.otp))) {
      return res.status(401).json({ success: false, error: 'Invalid OTP' });
    }

    const accessToken = jwt.sign(
      {
        type: 'access',
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role,
        iat: Math.floor(Date.now() / 1000)
      },
      JWT_SECRET,
      { expiresIn: `${SESSION_EXPIRY}h` }
    );

    return res.status(200).json({
      success: true,
      accessToken,
      user: {
        id: decoded.userId,
        username: decoded.username,
        role: decoded.role
      },
      expiresIn: SESSION_EXPIRY * 3600
    });

  } catch (err) {
    console.error('[/api/auth/verify-otp]', err.message);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
