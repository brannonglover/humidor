import { API_BASE_URL } from './config';

// Web redirect URLs: Stripe Checkout runs in a browser, which can't open custom schemes directly.
// The server serves /subscribe-success and /subscribe-cancel, which redirect to the app.
const SUBSCRIBE_SUCCESS_URL = `${API_BASE_URL}/subscribe-success`;
const SUBSCRIBE_CANCEL_URL = `${API_BASE_URL}/subscribe-cancel`;

/**
 * Confirm checkout session and update tier immediately.
 * Call when user returns via success deep link with session_id.
 */
export async function confirmCheckoutSession(accessToken, sessionId) {
  if (!sessionId) return null;
  const res = await fetch(`${API_BASE_URL}/api/subscription/confirm-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ session_id: sessionId }),
  });
  const data = await res.json().catch(() => ({}));
  return data.tier === 'premium' ? 'premium' : null;
}

export async function createCheckoutSession(accessToken, successUrl, cancelUrl) {
  const res = await fetch(`${API_BASE_URL}/api/subscription/create-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      successUrl: successUrl || SUBSCRIBE_SUCCESS_URL,
      cancelUrl: cancelUrl || SUBSCRIBE_CANCEL_URL,
    }),
  });

  const text = await res.text();
  const data = (() => {
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return {};
    }
  })();

  if (!res.ok) {
    const msg = data.error || (res.status === 503 ? 'Subscription not configured. Check Railway env vars.' : `Server error ${res.status}`);
    const hint = !data.error && text?.slice(0, 100) ? ` (${text.slice(0, 80)}…)` : '';
    throw new Error(msg + hint);
  }
  if (data.alreadySubscribed) {
    return { alreadySubscribed: true };
  }
  return data.url;
}

/**
 * Check if subscription is configured on the server (for debugging).
 * Returns { configured: boolean, missing: string[] }
 */
export async function getSubscriptionStatus() {
  const res = await fetch(`${API_BASE_URL}/api/subscription/status`);
  if (res.status === 404) {
    throw new Error(
      `Status endpoint not found (404). The server at ${API_BASE_URL} may be outdated or a different project. ` +
      'Deploy the latest server code to Railway, or ensure your app points to the correct API (check eas.json EXPO_PUBLIC_API_URL).'
    );
  }
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Server returned invalid JSON (${res.status}). Check ${API_BASE_URL}/api/subscription/status in a browser.`);
  }
  return {
    configured: !!data.configured,
    missing: Array.isArray(data.missing) ? data.missing : [],
  };
}

/**
 * Checkout or portal - use before createCheckoutSession.
 * If tier is 'premium', returns { alreadySubscribed: true } without calling the API.
 */
export async function subscribeOrManage(accessToken, tier, successUrl, cancelUrl) {
  if (tier === 'premium') {
    return { alreadySubscribed: true };
  }
  return createCheckoutSession(accessToken, successUrl, cancelUrl);
}

/**
 * Create Stripe Customer Portal session for managing subscription.
 * Returns portal URL or throws if no active subscription.
 */
export async function createPortalSession(accessToken) {
  const res = await fetch(`${API_BASE_URL}/api/subscription/create-portal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({}),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to open subscription management');
  }
  return data.url;
}
