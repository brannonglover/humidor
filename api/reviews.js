import { API_BASE_URL } from './config';

const REVIEWS_URL = `${API_BASE_URL}/api/reviews`;

export async function searchReviewsByTaste(keywords) {
  if (!keywords?.length) return [];
  const q = keywords.map((k) => String(k).trim()).filter(Boolean).join(',');
  if (!q) return [];
  try {
    const res = await fetch(`${REVIEWS_URL}/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    return res.json();
  } catch (err) {
    console.warn('Reviews search failed:', err.message);
    return [];
  }
}

export async function getTopReviewedCigars(limit = 5) {
  try {
    const res = await fetch(`${REVIEWS_URL}/top?limit=${limit}`);
    if (!res.ok) throw new Error(`Top failed: ${res.status}`);
    const rows = await res.json();
    return rows ?? [];
  } catch (err) {
    console.warn('Reviews top failed:', err.message);
    return [];
  }
}

export async function submitReview(review) {
  const { catalog_id, brand, name, length, user_id, rating, flavor_profile, favorite_notes, strength_profile, construction_quality, flavor_changes } = review;
  const res = await fetch(REVIEWS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      catalog_id: catalog_id ?? null,
      brand: brand ?? null,
      name: name ?? null,
      length: length ?? null,
      user_id: user_id || null,
      rating: rating != null ? parseInt(rating, 10) : null,
      flavor_profile: flavor_profile || null,
      favorite_notes: favorite_notes || null,
      strength_profile: typeof strength_profile === 'string' ? strength_profile : JSON.stringify(strength_profile || {}),
      construction_quality: construction_quality || null,
      flavor_changes: flavor_changes || null,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to submit review: ${res.status}`);
  }
  return res.json();
}
