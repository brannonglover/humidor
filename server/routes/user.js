const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const pool = require('../config/postgres');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * GET /api/user/tier
 * Returns { tier: 'free' | 'premium' }
 * Requires: Authorization: Bearer <supabase_access_token>
 */
router.get('/tier', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token || !supabase) {
    return res.status(401).json({ tier: 'free' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ tier: 'free' });
    }

    await pool.query(
      `INSERT INTO user_profiles (id, tier, updated_at)
       VALUES ($1, 'free', NOW())
       ON CONFLICT (id) DO UPDATE SET updated_at = NOW()`,
      [user.id]
    );
    const { rows } = await pool.query(
      'SELECT tier FROM user_profiles WHERE id = $1',
      [user.id]
    );
    const tier = rows[0]?.tier === 'premium' ? 'premium' : 'free';
    return res.json({ tier });
  } catch (err) {
    console.error('Tier fetch error:', err);
    return res.status(500).json({ tier: 'free' });
  }
});

module.exports = router;
