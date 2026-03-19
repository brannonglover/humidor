const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const pool = require('../config/postgres');

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripePriceId = process.env.STRIPE_PRICE_ID;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const stripe = stripeSecret ? new Stripe(stripeSecret) : null;
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * GET /api/subscription/status
 * Returns whether subscription is configured (for debugging TestFlight/Railway setup).
 * No auth required.
 */
router.get('/status', (_req, res) => {
  const missing = [];
  if (!stripeSecret) missing.push('STRIPE_SECRET_KEY');
  if (!stripePriceId) missing.push('STRIPE_PRICE_ID');
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
  res.json({
    configured: missing.length === 0,
    missing,
  });
});

/**
 * POST /api/subscription/create-checkout
 * Body: { successUrl?, cancelUrl? }
 * Headers: Authorization: Bearer <supabase_access_token>
 * Returns: { url: string } - Stripe Checkout URL
 */
router.post('/create-checkout', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token || !supabase || !stripe || !stripePriceId) {
    return res.status(503).json({ error: 'Subscription not configured' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Ensure user_profiles row exists (may not exist if user never hit /api/user/tier)
    await pool.query(
      `INSERT INTO user_profiles (id, tier, updated_at)
       VALUES ($1, 'free', NOW())
       ON CONFLICT (id) DO UPDATE SET updated_at = NOW()`,
      [user.id]
    );

    const { rows } = await pool.query(
      'SELECT tier, stripe_customer_id FROM user_profiles WHERE id = $1',
      [user.id]
    );
    const tier = rows[0]?.tier;
    let customerId = rows[0]?.stripe_customer_id;

    if (tier === 'premium') {
      return res.status(200).json({ alreadySubscribed: true });
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await pool.query(
        'UPDATE user_profiles SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2',
        [customerId, user.id]
      );
    }

    const baseUrl = (req.protocol || 'http') + '://' + (req.get('host') || 'localhost:5001');
    const rawSuccessUrl = req.body?.successUrl || `${baseUrl}/success`;
    const successUrl = rawSuccessUrl + (rawSuccessUrl.includes('?') ? '&' : '?') + 'session_id={CHECKOUT_SESSION_ID}';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: req.body?.cancelUrl || `${baseUrl}/cancel`,
      metadata: { supabase_user_id: user.id },
      subscription_data: { metadata: { supabase_user_id: user.id } },
    });

    return res.json({ url: session.url });
  } catch (err) {
    // Stripe errors: err.message, err.code, err.type
    const msg = err.message || err.type || 'Failed to create checkout';
    const code = err.code ? ` (${err.code})` : '';
    console.error('Checkout error:', err);
    return res.status(500).json({ error: msg + code });
  }
});

/**
 * POST /api/subscription/create-portal
 * Headers: Authorization: Bearer <supabase_access_token>
 * Returns: { url: string } - Stripe Customer Portal URL for managing subscription
 */
router.post('/create-portal', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token || !supabase || !stripe) {
    return res.status(503).json({ error: 'Subscription not configured' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { rows } = await pool.query(
      'SELECT tier, stripe_customer_id FROM user_profiles WHERE id = $1',
      [user.id]
    );
    const tier = rows[0]?.tier;
    const customerId = rows[0]?.stripe_customer_id;

    if (tier !== 'premium' || !customerId) {
      return res.status(400).json({ error: 'No active subscription to manage' });
    }

    const baseUrl = (req.protocol || 'http') + '://' + (req.get('host') || 'localhost:5001');
    const returnUrl = `${baseUrl}/subscribe-success`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return res.json({ url: portalSession.url });
  } catch (err) {
    console.error('Portal error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create portal session' });
  }
});

/**
 * POST /api/subscription/confirm-session
 * Body: { session_id: string }
 * Headers: Authorization: Bearer <supabase_access_token>
 * Called when user returns from Stripe Checkout success URL.
 * Verifies payment and updates tier immediately (avoids webhook timing race).
 */
router.post('/confirm-session', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const sessionId = req.body?.session_id;

  if (!token || !supabase || !stripe || !sessionId) {
    return res.status(400).json({ error: 'Missing session_id or auth' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (checkoutSession.metadata?.supabase_user_id !== user.id) {
      return res.status(403).json({ error: 'Session does not belong to this user' });
    }

    if (checkoutSession.payment_status === 'paid' && checkoutSession.mode === 'subscription') {
      const sub = checkoutSession.subscription;
      const status = typeof sub === 'object' ? sub?.status : null;
      if (status === 'active' || status === 'trialing') {
        await pool.query(
          "UPDATE user_profiles SET tier = 'premium', updated_at = NOW() WHERE id = $1",
          [user.id]
        );
        return res.json({ tier: 'premium' });
      }
    }

    return res.json({ tier: 'free' });
  } catch (err) {
    console.error('Confirm session error:', err);
    return res.status(500).json({ error: err.message || 'Failed to confirm session' });
  }
});

/**
 * POST /api/subscription/restore
 * Restore subscription for users who reinstalled the app but still have an active Stripe subscription.
 * Links by email when no stripe_customer_id, or re-checks Stripe when tier is out of sync.
 * Returns { tier: 'free' | 'premium', restored: boolean }
 */
router.post('/restore', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token || !supabase || !stripe) {
    return res.status(503).json({ error: 'Subscription not configured' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await pool.query(
      `INSERT INTO user_profiles (id, tier, updated_at)
       VALUES ($1, 'free', NOW())
       ON CONFLICT (id) DO UPDATE SET updated_at = NOW()`,
      [user.id]
    );

    const { rows } = await pool.query(
      'SELECT tier, stripe_customer_id FROM user_profiles WHERE id = $1',
      [user.id]
    );
    let tier = rows[0]?.tier === 'premium' ? 'premium' : 'free';
    const customerId = rows[0]?.stripe_customer_id;
    let restored = false;

    if (tier === 'premium') {
      return res.json({ tier: 'premium', restored: false });
    }

    // Case 1: No stripe_customer_id - try to link by email (e.g. reinstalled, different auth provider)
    if (!customerId && user.email) {
      const { data: customers } = await stripe.customers.list({
        email: user.email.trim(),
        limit: 1,
      });
      const customer = customers[0];
      if (customer) {
        const { data: subs } = await stripe.subscriptions.list({
          customer: customer.id,
          status: 'active',
          limit: 1,
        });
        if (subs.length > 0) {
          await pool.query(
            "UPDATE user_profiles SET stripe_customer_id = $1, tier = 'premium', updated_at = NOW() WHERE id = $2",
            [customer.id, user.id]
          );
          tier = 'premium';
          restored = true;
        }
      }
    }

    // Case 2: Has stripe_customer_id but tier is free - re-check Stripe (e.g. resubscribed, sync issue)
    if (tier === 'free' && customerId) {
      const { data: subs } = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1,
      });
      if (subs.length > 0) {
        await pool.query(
          "UPDATE user_profiles SET tier = 'premium', updated_at = NOW() WHERE id = $1",
          [user.id]
        );
        tier = 'premium';
        restored = true;
      }
    }

    return res.json({ tier, restored });
  } catch (err) {
    console.error('Restore subscription error:', err);
    return res.status(500).json({ error: err.message || 'Failed to restore subscription' });
  }
});

/**
 * Webhook handler - must be used with express.raw() for body (see index.js)
 */
async function handleWebhook(req, res) {
  if (!stripe || !webhookSecret) {
    return res.status(503).send('Webhook not configured');
  }

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
    const sub = event.data.object;
    const userId = sub.metadata?.supabase_user_id;
    if (userId && sub.status === 'active') {
      await pool.query(
        "UPDATE user_profiles SET tier = 'premium', updated_at = NOW() WHERE id = $1",
        [userId]
      );
    }
  } else if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    const userId = sub.metadata?.supabase_user_id;
    if (userId) {
      await pool.query(
        "UPDATE user_profiles SET tier = 'free', updated_at = NOW() WHERE id = $1",
        [userId]
      );
    }
  }

  res.json({ received: true });
}

module.exports = router;
module.exports.handleWebhook = handleWebhook;
