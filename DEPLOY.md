# Etsy Edge — Deploy Runbook

> Everything is built. When the Etsy API key arrives (or if you already have one), follow these steps.

## Pre-Flight Check

You should already have:
- [x] Extension code (WXT framework, Chrome MV3)
- [x] Cloudflare Worker backend (Hono, rate-limited)
- [x] Marketing site at etsyedge.app
- [x] ExtensionPay payment integration coded
- [x] SEO scorer, tag spy, AI suggestions, competitor analysis

## Step 1: Deploy the Cloudflare Worker (~10 min)

```bash
cd C:\coding\etsy-edge\worker
npm install
npx wrangler login          # One-time: authenticate with Cloudflare
npx wrangler deploy          # Deploys to etsy-edge-api.<your-subdomain>.workers.dev
```

Copy the URL from the deploy output. It'll look like:
`https://etsy-edge-api.<something>.workers.dev`

## Step 2: Set Worker Secrets (~2 min)

```bash
cd C:\coding\etsy-edge\worker
npx wrangler secret put ETSY_API_KEY
# Paste your Etsy API keystring (the one from your Etsy developer app)

npx wrangler secret put OPENAI_API_KEY
# Paste your OpenAI API key (for AI tag suggestions)
```

## Step 3: Update Config (~1 min)

Edit `src/lib/config.ts`:
```typescript
export const WORKER_URL = import.meta.env.DEV
  ? "http://localhost:8787"
  : "https://etsy-edge-api.YOUR_ACTUAL_SUBDOMAIN.workers.dev";
//                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                          Replace with the URL from Step 1
```

## Step 4: Test Locally (~15 min)

```bash
# Terminal 1: Start the worker locally
cd worker && npx wrangler dev

# Terminal 2: Start the extension in dev mode
cd .. && npm run dev
```

Load the extension in Chrome:
1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" → select `.output/chrome-mv3-dev`
4. Navigate to any Etsy listing page
5. Verify: Tag Spy panel appears, tags load, SEO score shows

## Step 5: Build & Package (~2 min)

```bash
npm run build     # Production build
npm run zip       # Creates .output/etsy-edge-0.1.0-chrome.zip
```

## Step 6: Chrome Web Store Submission (~20 min)

1. Go to https://chrome.google.com/webstore/devconsole
2. Pay $5 developer fee (one-time)
3. Click "New Item" → upload `.output/etsy-edge-0.1.0-chrome.zip`
4. Fill in:
   - **Title:** Etsy Edge — SEO Tags & AI Optimization
   - **Summary:** See any Etsy listing's hidden tags. Get AI-powered suggestions. Beat competitors.
   - **Description:** (use marketing copy from site/index.html)
   - **Category:** Shopping
   - **Language:** English
   - **Privacy Policy:** https://etsyedge.app/privacy-policy.html
5. Upload 4-5 screenshots (take them from testing in Step 4)
6. Submit for review (typically 1-3 business days)

## Step 7: Set Up Payments (~30 min)

1. Go to https://extensionpay.com
2. Create account + register extension as `etsy-edge`
3. Set price: $9.99/month
4. Complete Stripe onboarding
5. Verify the ID matches `EXTENSION_PAY_ID` in `src/lib/payment.ts`

## Step 8: Update Marketing Site (~15 min)

After Chrome Web Store approval, you'll get a URL like:
`https://chrome.google.com/webstore/detail/etsy-edge/.../`

Replace all placeholders:
```bash
# In site/ directory, replace all href="#" with Chrome Web Store URL
# Replace all [your-email] with your actual email
# Files: site/index.html, site/privacy-policy.html, site/blog/*.html
```

Push to GitHub → GitHub Pages auto-deploys.

## Step 9: Launch Marketing

See `marketing/README.md` for the full launch sequence.

Quick version:
1. Post in r/EtsySellers, r/Etsy
2. Post on Twitter/X with demo video
3. Submit to Product Hunt
4. Cross-post to LinkedIn

---

## Troubleshooting

**Worker returns 403:** Check CORS — make sure the extension ID matches
**Tags don't load:** Check Etsy API key is valid: `curl -H "x-api-key: YOUR_KEY" https://openapi.etsy.com/v3/application/listings/1234567890`
**AI suggestions fail:** Check OpenAI key has credits and is valid
**Payment not working:** ExtensionPay requires the extension to be published in Chrome Web Store first

## Architecture Reminder

```
Chrome Extension → Cloudflare Worker → Etsy API (tags, search)
                                     → OpenAI API (AI suggestions)
                 → ExtensionPay (payments, no backend needed)
```

API keys stay on the worker. Users never see them.
