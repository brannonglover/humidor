# Deploy Cavaro API to Railway

## 1. Create a Railway project

1. Go to [railway.app](https://railway.app) and sign in (GitHub recommended).
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select your `humidor` repo.
4. Railway will detect the project. Set **Root Directory** to `server` (so it deploys only the API, not the whole app).

## 2. Configure environment variables

In your Railway project: **Variables** tab → add these (copy from `server/.env`, but use production values where noted):

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | Railway sets this automatically; you can leave it unset |
| `DATABASE_URL` | Your Supabase Postgres connection string |
| `SUPABASE_URL` | `https://srucfmfykauxdnwyyaav.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase Dashboard |
| `STRIPE_SECRET_KEY` | Your Stripe secret key |
| `STRIPE_PRICE_ID` | Your Stripe price ID |
| `STRIPE_WEBHOOK_SECRET` | **New value** – see step 3 below |
| `GMAIL_USER` | Your Gmail address |
| `GMAIL_APP_PASSWORD` | Your Gmail app password |
| `OPENAI_API_KEY` | Your OpenAI API key |

## 3. Update Stripe webhook

1. Deploy once (Railway will give you a URL like `https://your-app.up.railway.app`).
2. In [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks), add an endpoint:
   - **URL:** `https://your-app.up.railway.app/api/subscription/webhook`
   - **Events:** `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
3. Copy the **Signing secret** (starts with `whsec_`).
4. In Railway **Variables**, set `STRIPE_WEBHOOK_SECRET` to that value.
5. Redeploy so the new variable is picked up.

## 4. Point your app at the API

In your app’s EAS build config (or `.env` for production), set:

```
EXPO_PUBLIC_API_URL=https://your-app.up.railway.app
```

Replace `your-app.up.railway.app` with your actual Railway URL (from the **Settings** → **Domains** section).

## 5. Local development

- **Production start:** `npm start` (used by Railway)
- **Local dev with auto-reload:** `npm run dev`
