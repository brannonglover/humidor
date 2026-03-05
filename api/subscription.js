import { API_BASE_URL } from './config';

export async function createCheckoutSession(accessToken, successUrl, cancelUrl) {
  const res = await fetch(`${API_BASE_URL}/api/subscription/create-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ successUrl, cancelUrl }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create checkout');
  }
  return data.url;
}
