const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const pool = require('../config/postgres');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

/**
 * If user is free and has no stripe_customer_id, try to link by email (website subscribers).
 */
async function tryLinkSubscriptionByEmail(userId, userEmail) {
  if (!stripe || !userEmail) return null;

  const { rows } = await pool.query(
    'SELECT tier, stripe_customer_id FROM user_profiles WHERE id = $1',
    [userId]
  );
  const profile = rows[0];
  if (!profile || profile.tier === 'premium' || profile.stripe_customer_id) {
    return null;
  }

  try {
    const { data: customers } = await stripe.customers.list({
      email: userEmail.trim(),
      limit: 1,
    });
    const customer = customers[0];
    if (!customer) return null;

    const { data: subs } = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    });
    if (!subs.length) return null;

    await pool.query(
      "UPDATE user_profiles SET stripe_customer_id = $1, tier = 'premium', updated_at = NOW() WHERE id = $2",
      [customer.id, userId]
    );
    return 'premium';
  } catch (err) {
    console.error('Link subscription by email error:', err);
    return null;
  }
}

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

    const linked = await tryLinkSubscriptionByEmail(user.id, user.email);
    if (linked === 'premium') {
      return res.json({ tier: 'premium' });
    }

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
