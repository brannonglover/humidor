/**
 * Analytics service for tracking screen views and feature usage.
 * Uses PostHog's capture API when EXPO_PUBLIC_POSTHOG_KEY is set.
 * No-op when not configured (safe for local dev).
 */

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

let distinctId = null;

/**
 * Set the distinct user ID (e.g. Supabase user id). Call after auth.
 */
export function setUserId(userId) {
  distinctId = userId;
}

/**
 * Track a screen view (tab or stack screen).
 */
export function trackScreen(screenName, params = {}) {
  capture('screen_view', { screen: screenName, ...params });
}

/**
 * Track a feature/action event.
 */
export function trackEvent(eventName, properties = {}) {
  capture(eventName, properties);
}

function capture(event, properties = {}) {
  if (!POSTHOG_KEY) return;

  const payload = {
    api_key: POSTHOG_KEY,
    event,
    distinct_id: distinctId || 'anonymous',
    properties: {
      ...properties,
      $lib: 'cavaro-analytics',
      timestamp: new Date().toISOString(),
    },
  };

  fetch(`${POSTHOG_HOST}/capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {}); // Fire and forget
}
