const path = require('path');
const express = require('express');
const colors = require('colors');
const cors = require('cors');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const catalogRoutes = require('./routes/catalog');
const uploadRoutes = require('./routes/upload');
const feedbackRoutes = require('./routes/feedback');
const pairingRoutes = require('./routes/pairing');
const userRoutes = require('./routes/user');
const subscriptionRoutes = require('./routes/subscription');
const { handleWebhook } = require('./routes/subscription');
const port = process.env.PORT || 5001;

const app = express();

// Stripe webhook needs raw body - must be before express.json()
app.use('/api/subscription/webhook', express.raw({ type: 'application/json' }), handleWebhook);

app.use(express.json());
app.use(cors());

// Stripe Checkout redirect: browser can't open custom schemes directly, so we land on HTTPS first
// then redirect to the app. Must be served from same origin as API.
const APP_SCHEME = 'com.brannonglover.humidor';
function redirectPage(path, hasSessionId = false) {
  return (req, res) => {
    const sessionId = req.query.session_id || '';
    const qs = hasSessionId && sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : '';
    const target = `${APP_SCHEME}://${path}${qs}`;
    const htmlEscaped = target.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${htmlEscaped}"></head><body><p>Redirecting to app&hellip; <a href="${htmlEscaped}">Open Cavaro</a></p><script>window.location.href=${JSON.stringify(target)};</script></body></html>`);
  };
}
app.get('/subscribe-success', redirectPage('subscribe-success', true));
app.get('/subscribe-success/', redirectPage('subscribe-success', true));
app.get('/subscribe-cancel', redirectPage('subscribe-cancel', false));
app.get('/subscribe-cancel/', redirectPage('subscribe-cancel', false));

// Shared cigar catalog (PostgreSQL)
app.use('/api/catalog', catalogRoutes);
// Image upload (Supabase Storage)
app.use('/api/upload', uploadRoutes);
// User feedback (emails to brannonglover@gmail.com)
app.use('/api/feedback', feedbackRoutes);
// AI drink pairing (OpenAI proxy)
app.use('/api/pairing', pairingRoutes);
// User tier (Supabase Auth + user_profiles)
app.use('/api/user', userRoutes);
// Stripe subscription (checkout; webhook mounted above)
app.use('/api/subscription', subscriptionRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`.green);
});