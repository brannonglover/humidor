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

    const { rows } = await pool.query(
      'SELECT stripe_customer_id FROM user_profiles WHERE id = $1',
      [user.id]
    );
    let customerId = rows[0]?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await pool.query(
        'UPDATE user_profiles SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2',
        [customerId, user.id]
      );
    }

    const baseUrl = (req.protocol || 'http') + '://' + (req.get('host') || 'localhost:5001');
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: req.body?.successUrl || `${baseUrl}/success`,
      cancel_url: req.body?.cancelUrl || `${baseUrl}/cancel`,
      metadata: { supabase_user_id: user.id },
      subscription_data: { metadata: { supabase_user_id: user.id } },
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create checkout' });
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
