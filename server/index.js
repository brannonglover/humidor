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