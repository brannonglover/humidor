const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const pool = require('../config/postgres');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * POST /api/pairing
 * Body: { cigar: string }
 * Headers: Authorization: Bearer <token> (required when Supabase configured - premium tier only)
 * Proxies to OpenAI API for drink pairing suggestions.
 */
router.post('/', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'OpenAI API key not configured. Add OPENAI_API_KEY to server/.env',
    });
  }

  // When Supabase is configured, require premium tier
  if (supabase) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Sign in required' });
    }
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }
      const { rows } = await pool.query(
        'SELECT tier FROM user_profiles WHERE id = $1',
        [user.id]
      );
      if (rows[0]?.tier !== 'premium') {
        return res.status(403).json({ error: 'Premium subscription required for drink pairing' });
      }
    } catch (err) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
  }

  const cigar = (req.body?.cigar || '').trim();
  if (!cigar) {
    return res.status(400).json({ error: 'Please enter a cigar name.' });
  }

  const systemPrompt = `You are a cigar and beverage pairing expert. Given a cigar name, suggest 2-4 drink pairings that complement it well. Include brief reasoning for each pairing (why the flavors work together). Keep responses concise and practical, suitable for a mobile app. Format as a short list with bullet points or numbered items.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `What drinks pair well with this cigar: ${cigar}?` },
        ],
        max_tokens: 400,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data.error?.message || data.error || 'OpenAI request failed';
      return res.status(response.status).json({ error: errMsg });
    }

    const content = data.choices?.[0]?.message?.content?.trim() || 'No response received.';
    return res.json({ pairing: content });
  } catch (err) {
    console.error('Pairing API error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to get pairing suggestions. Check your connection.',
    });
  }
});

module.exports = router;
