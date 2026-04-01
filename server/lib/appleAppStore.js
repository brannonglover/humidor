const { AppStoreServerAPIClient, Environment, Status } = require('@apple/app-store-server-library');

function decodeJwsPayload(jws) {
  if (!jws || typeof jws !== 'string') return null;
  const parts = jws.split('.');
  if (parts.length < 2) return null;
  const json = Buffer.from(parts[1], 'base64url').toString('utf8');
  return JSON.parse(json);
}

function getBundleId() {
  return process.env.APP_STORE_BUNDLE_ID || 'com.brannonglover.cavaro';
}

function getPremiumProductId() {
  return process.env.APP_STORE_PREMIUM_PRODUCT_ID || 'com.gloverlabs.cavaro.monthly_premium';
}

function getEnvironment() {
  return process.env.APP_STORE_ENV === 'production' ? Environment.PRODUCTION : Environment.SANDBOX;
}

/**
 * App Store Server API client (JWT auth). Requires .p8 key in APP_STORE_PRIVATE_KEY.
 */
function normalizeP8Key(key) {
  if (!key?.trim()) return null;
  if (key.includes('-----BEGIN')) return key.replace(/\\n/g, '\n');
  try {
    return Buffer.from(key, 'base64').toString('utf8');
  } catch {
    return key;
  }
}

function createApiClient() {
  const key = normalizeP8Key(process.env.APP_STORE_PRIVATE_KEY);
  const keyId = process.env.APP_STORE_KEY_ID;
  const issuerId = process.env.APP_STORE_ISSUER_ID;
  const bundleId = getBundleId();
  if (!key || !keyId || !issuerId) return null;
  return new AppStoreServerAPIClient(key, keyId, issuerId, bundleId, getEnvironment());
}

function iapConfigured() {
  return !!(
    process.env.APP_STORE_PRIVATE_KEY &&
    process.env.APP_STORE_KEY_ID &&
    process.env.APP_STORE_ISSUER_ID
  );
}

/**
 * Fetches signed transaction from Apple and returns decoded JWSTransaction payload.
 * Trust boundary: response is from Apple's authenticated API.
 */
async function getTransactionFromApple(transactionId) {
  const client = createApiClient();
  if (!client) throw new Error('App Store API not configured');
  const res = await client.getTransactionInfo(transactionId);
  if (!res?.signedTransactionInfo) throw new Error('No transaction data from Apple');
  const tx = decodeJwsPayload(res.signedTransactionInfo);
  if (!tx) throw new Error('Invalid transaction data');
  return { tx, client };
}

function assertTransactionMatchesUser(tx, userId) {
  const bundleId = getBundleId();
  const productId = getPremiumProductId();
  if (tx.bundleId && tx.bundleId !== bundleId) {
    throw new Error('Invalid app bundle for this purchase');
  }
  if (tx.productId !== productId) {
    throw new Error('Invalid subscription product');
  }
  if (tx.appAccountToken && tx.appAccountToken.toLowerCase() !== String(userId).toLowerCase()) {
    throw new Error('This Apple subscription is linked to a different Cavaro account');
  }
  if (tx.revocationDate) {
    throw new Error('This purchase was revoked');
  }
  const expires = tx.expiresDate;
  if (expires && expires < Date.now()) {
    throw new Error('Subscription has expired');
  }
}

/**
 * Reconcile tier with Apple using stored original transaction id (renewals, expiry).
 */
async function syncSubscriptionTierFromApple(pool, userId) {
  const client = createApiClient();
  if (!client) return null;

  const { rows } = await pool.query(
    'SELECT tier, apple_original_transaction_id FROM user_profiles WHERE id = $1',
    [userId]
  );
  const row = rows[0];
  if (!row?.apple_original_transaction_id) {
    return row?.tier === 'premium' ? 'premium' : 'free';
  }

  const otid = row.apple_original_transaction_id;

  try {
    const status = await client.getAllSubscriptionStatuses(otid);
    const last = status?.data?.[0]?.lastTransactions?.[0];
    if (!last) {
      await pool.query("UPDATE user_profiles SET tier = 'free', updated_at = NOW() WHERE id = $1", [userId]);
      return 'free';
    }
    const st = last.status;
    const active = st === Status.ACTIVE || st === 1;
    if (active) {
      await pool.query("UPDATE user_profiles SET tier = 'premium', updated_at = NOW() WHERE id = $1", [userId]);
      return 'premium';
    }
    await pool.query("UPDATE user_profiles SET tier = 'free', updated_at = NOW() WHERE id = $1", [userId]);
    return 'free';
  } catch (e) {
    console.error('Apple getAllSubscriptionStatuses error:', e);
    return row.tier === 'premium' ? 'premium' : 'free';
  }
}

module.exports = {
  decodeJwsPayload,
  getBundleId,
  getPremiumProductId,
  getEnvironment,
  createApiClient,
  iapConfigured,
  getTransactionFromApple,
  assertTransactionMatchesUser,
  syncSubscriptionTierFromApple,
};
