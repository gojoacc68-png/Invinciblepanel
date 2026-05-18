/**
 * GET    /api/firebase/configs   — List all Firebase configs
 * POST   /api/firebase/configs   — Add a new Firebase config
 *
 * Firebase config fields are encrypted at rest using AES-256-GCM.
 * Only owners and admins can manage Firebase configurations.
 */

const crypto = require('crypto');
const { handleCors, extractToken, verifyToken } = require('../../middleware/auth');
const { rateLimit } = require('../../middleware/rateLimit');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  throw new Error('ENCRYPTION_KEY must be at least 32 characters');
}

const KEY_BUFFER = Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'utf8');

function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY_BUFFER, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(encryptedText) {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY_BUFFER, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Test a Firebase config by attempting to fetch the project metadata.
 */
async function testFirebaseConnection(config) {
  try {
    const url = `https://${config.projectId}-default-rtdb.firebaseio.com/.json?shallow=true`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return { connected: resp.ok, statusCode: resp.status };
  } catch {
    return { connected: false, error: 'Connection timeout' };
  }
}

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

  if (!['owner', 'admin'].includes(caller.role)) {
    return res.status(403).json({ success: false, error: 'Insufficient permissions' });
  }

  // ── GET /api/firebase/configs ─────────────────────────────────────────────
  if (req.method === 'GET') {
    // ── REPLACE WITH YOUR DATABASE LOGIC ──────────────────────────────────
    // const { sql } = require('@vercel/postgres');
    // const result = await sql`
    //   SELECT id, name, project_id, database_url, status, assigned_users_count,
    //          created_at, last_synced_at
    //   FROM firebase_configs
    //   ORDER BY created_at DESC
    // `;
    // Return configs without sensitive fields (api_key is encrypted, don't expose)
    // ─────────────────────────────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      configs: [],
      message: 'Configure database to return Firebase configs'
    });
  }

  // ── POST /api/firebase/configs ────────────────────────────────────────────
  if (req.method === 'POST') {
    const { name, projectId, apiKey, authDomain, databaseUrl, storageBucket } = req.body || {};

    if (!name || !projectId || !apiKey || !authDomain || !databaseUrl) {
      return res.status(400).json({
        success: false,
        error: 'name, projectId, apiKey, authDomain, and databaseUrl are required'
      });
    }

    const encryptedApiKey = encrypt(apiKey);

    // Test connection before saving
    const connectionTest = await testFirebaseConnection({ projectId, databaseUrl });

    // ── REPLACE WITH YOUR DATABASE LOGIC ──────────────────────────────────
    // const { sql } = require('@vercel/postgres');
    // const result = await sql`
    //   INSERT INTO firebase_configs (name, project_id, api_key_encrypted,
    //     auth_domain, database_url, storage_bucket, status, created_by)
    //   VALUES (${name}, ${projectId}, ${encryptedApiKey},
    //     ${authDomain}, ${databaseUrl}, ${storageBucket || null},
    //     ${connectionTest.connected ? 'active' : 'error'}, ${caller.userId})
    //   RETURNING id, name, project_id, database_url, status, created_at
    // `;
    // return res.status(201).json({ success: true, config: result.rows[0], connectionTest });
    // ─────────────────────────────────────────────────────────────────────

    return res.status(201).json({
      success: true,
      message: 'Configure database to persist Firebase config',
      connectionTest,
      config: { name, projectId, databaseUrl, status: connectionTest.connected ? 'active' : 'error' }
    });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
