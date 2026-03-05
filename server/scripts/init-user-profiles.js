/**
 * Creates user_profiles table for tier storage.
 * Run: cd server && node scripts/init-user-profiles.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../config/postgres');

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      id UUID PRIMARY KEY,
      tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
      stripe_customer_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_profiles_tier ON user_profiles(tier)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe ON user_profiles(stripe_customer_id)
  `);
  console.log('user_profiles table ready');
  process.exit(0);
}

init().catch((err) => {
  console.error(err);
  process.exit(1);
});
