#!/usr/bin/env node
/**
 * Verify Stripe config: list account and check if price exists.
 * Run: node scripts/verify-stripe.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const Stripe = require('stripe');

const secret = process.env.STRIPE_SECRET_KEY;
const priceId = process.env.STRIPE_PRICE_ID;

if (!secret) {
  console.error('STRIPE_SECRET_KEY not set');
  process.exit(1);
}

const stripe = new Stripe(secret);
const accountId = secret.replace(/^sk_(test|live)_/, '').slice(0, 20);

console.log('Stripe account (from key):', accountId);
console.log('Mode:', secret.startsWith('sk_test_') ? 'TEST' : 'LIVE');
console.log('Price ID from .env:', priceId || '(not set)');
console.log('');

async function run() {
  if (priceId) {
    try {
      const price = await stripe.prices.retrieve(priceId);
      console.log('✓ Price exists:', price.id, '-', price.unit_amount / 100, price.currency);
    } catch (e) {
      console.log('✗ Price NOT found:', e.message);
      if (e.message?.includes('live mode')) {
        console.log('  → Create the price in TEST mode, or use a test-mode price ID.');
      }
    }
  }

  // List first few prices in this account
  const { data } = await stripe.prices.list({ limit: 5 });
  console.log('\nFirst 5 prices in this account:');
  data.forEach((p) => {
    const amt = p.unit_amount ? `${p.unit_amount / 100} ${p.currency}` : 'N/A';
    console.log('  ', p.id, '-', amt, p.recurring ? `(${p.recurring.interval})` : '');
  });
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
