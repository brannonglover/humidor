import { API_BASE_URL } from './config';
import {
  restoreAppleSubscription,
  isIapAvailable,
  premiumUnavailableMessage,
  requestPremiumPurchase,
  waitForIapPurchaseResult,
} from '../lib/iap';

/**
 * Check if subscription verification is configured on the server.
 * Returns { configured: boolean, missing: string[] }
 */
export async function getSubscriptionStatus() {
  const res = await fetch(`${API_BASE_URL}/api/subscription/status`);
  if (res.status === 404) {
    throw new Error(
      `Status endpoint not found (404). The server at ${API_BASE_URL} may be outdated. ` +
        'Deploy the latest server code, or ensure EXPO_PUBLIC_API_URL is correct.'
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
 * Start Apple IAP purchase (iOS). When { started: true }, await outcomePromise for completion/cancel.
 */
export async function subscribeOrManage(accessToken, tier, userId) {
  if (tier === 'premium') {
    return { alreadySubscribed: true };
  }
  if (!isIapAvailable()) {
    return { unavailable: true, message: premiumUnavailableMessage() };
  }
  const outcomePromise = waitForIapPurchaseResult();
  await requestPremiumPurchase(userId);
  return { started: true, outcomePromise };
}

/**
 * Restore Apple subscription and sync tier with the server.
 */
export async function restoreSubscription(accessToken) {
  return restoreAppleSubscription(accessToken);
}
