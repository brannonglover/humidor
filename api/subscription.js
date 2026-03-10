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

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create checkout');
  }
  return data.url;
}
