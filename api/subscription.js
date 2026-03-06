import { API_BASE_URL } from './config';

// Deep links to return to app after Stripe Checkout (matches CFBundleURLSchemes in Info.plist)
const SUBSCRIBE_SUCCESS_URL = 'com.brannonglover.humidor://subscribe-success';
const SUBSCRIBE_CANCEL_URL = 'com.brannonglover.humidor://subscribe-cancel';

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
