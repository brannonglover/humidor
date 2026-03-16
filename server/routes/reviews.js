const express = require('express');
const router = express.Router();
const pool = require('../config/postgres');

/**
 * Build LIKE conditions for taste search across review fields.
 * Keywords are OR'd (any match).
 */
function buildSearchConditions(keywords) {
  const conditions = [];
  const params = [];
  const searchCols = ['r.flavor_profile', 'r.favorite_notes', 'r.strength_profile', 'r.construction_quality', 'r.flavor_changes', 'c.description', 'c.wrapper', 'c.binder', 'c.filler'];
  for (const term of keywords) {
    const like = `%${term}%`;
    params.push(like);
    const paramPlaceholder = `$${params.length}`;
    const colConditions = searchCols.map((col) => `COALESCE(${col}, '') ILIKE ${paramPlaceholder}`);
    conditions.push(`(${colConditions.join(' OR ')})`);
  }
  return { conditions: conditions.join(' OR '), params };
}

// GET /api/reviews/search?q=earthy,woody,pepper
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const keywords = q
      .toLowerCase()
      .split(/[\s,]+/)
      .filter((k) => k.length > 0);
    if (keywords.length === 0) {
      return res.json([]);
    }
    const { conditions, params } = buildSearchConditions(keywords);
    const result = await pool.query(
      `SELECT DISTINCT c.id, c.brand, c.name, c.description, c.wrapper, c.binder, c.filler, c.length, c.image
       FROM cigar_reviews r
       JOIN cigar_catalog c ON c.id = r.catalog_id
       WHERE ${conditions}
       ORDER BY c.brand, c.name, c.length`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Reviews search error:', err);
    res.status(500).json({ error: 'Failed to search reviews' });
  }
});

// GET /api/reviews/top?limit=5
router.get('/top', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 5, 20);
    const result = await pool.query(
      `SELECT c.id, c.brand, c.name, c.description, c.wrapper, c.binder, c.filler, c.length, c.image,
              ROUND(AVG(r.rating)::numeric, 2) AS avg_rating,
              COUNT(r.id) AS review_count
       FROM cigar_reviews r
       JOIN cigar_catalog c ON c.id = r.catalog_id
       WHERE r.rating IS NOT NULL
       GROUP BY c.id, c.brand, c.name, c.description, c.wrapper, c.binder, c.filler, c.length, c.image
       HAVING COUNT(r.id) >= 1
       ORDER BY avg_rating DESC, review_count DESC
       LIMIT $1`,
      [limit]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Reviews top error:', err);
    res.status(500).json({ error: 'Failed to fetch top cigars' });
  }
});

// POST /api/reviews - submit a review
router.post('/', async (req, res) => {
  const { catalog_id, brand, name, length, user_id, rating, flavor_profile, favorite_notes, strength_profile, construction_quality, flavor_changes } = req.body;
  let resolvedCatalogId = catalog_id;
  if (!resolvedCatalogId && brand?.trim() && name?.trim() && length?.trim()) {
    const lookup = await pool.query(
      'SELECT id FROM cigar_catalog WHERE brand = $1 AND name = $2 AND length = $3',
      [brand.trim(), name.trim(), length.trim()]
    );
    resolvedCatalogId = lookup.rows[0]?.id;
  }
  if (!resolvedCatalogId) {
    return res.status(400).json({
      error: catalog_id
        ? 'Invalid catalog_id'
        : 'Cigar not found in catalog. Only cigars from the catalog can be shared.',
    });
  }
  const ratingVal = rating != null ? parseInt(rating, 10) : null;
  if (ratingVal != null && (ratingVal < 1 || ratingVal > 5)) {
    return res.status(400).json({ error: 'rating must be 1-5' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO cigar_reviews (catalog_id, user_id, rating, flavor_profile, favorite_notes, strength_profile, construction_quality, flavor_changes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, catalog_id, rating, created_at`,
      [
        resolvedCatalogId,
        user_id || null,
        ratingVal,
        flavor_profile?.trim() || null,
        favorite_notes?.trim() || null,
        strength_profile?.trim() || null,
        construction_quality?.trim() || null,
        flavor_changes?.trim() || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Reviews POST error:', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

module.exports = router;
