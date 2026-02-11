# Etsy Edge — Deploy Runbook

> Free features (Tag Spy, SEO Score, Competitor Analysis) work via DOM scraping — no API key needed.
> The Cloudflare Worker is only needed for the Pro tier (AI tag suggestions via OpenAI).

## Pre-Flight Check

You should already have:
- [x] Extension code (WXT framework, Chrome MV3)
- [x] DOM scraping for tags, SEO scoring, competitor analysis (no API dependency)
- [x] Cloudflare Worker backend (Hono, rate-limited) — for Pro AI features only
- [x] Marketing site at etsyedge.app
- [x] ExtensionPay payment integration coded

## Step 1: Test Free Features Locally (~10 min)

```bash
# Start the extension in dev mode (no worker needed for free features)
cd C:\coding\etsy-edge
npm run dev
```

Load the extension in Chrome:
1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" → select `.output/chrome-mv3-dev`
4. Navigate to any Etsy listing page
5. Verify: Tag Spy panel appears, tags load instantly, SEO score shows
6. Visit a few more listings, then check "Competitors" tab — should show aggregated tags

## Step 2: Deploy the Cloudflare Worker (Pro features only, ~10 min)

```bash
cd C:\coding\etsy-edge\worker
npm install
npx wrangler login          # One-time: authenticate with Cloudflare
npx wrangler deploy          # Deploys to etsy-edge-api.<your-subdomain>.workers.dev
```

Copy the URL from the deploy output. It'll look like:
`https://etsy-edge-api.<something>.workers.dev`

### Set Worker Secrets

```bash
cd C:\coding\etsy-edge\worker
npx wrangler secret put OPENAI_API_KEY
# Paste your OpenAI API key (for AI tag suggestions)
```

Note: `ETSY_API_KEY` is optional now. Set it if/when the key is approved for future bulk features.

### Update Config

Edit `src/lib/config.ts`:
```typescript
export const WORKER_URL = import.meta.env.DEV
  ? "http://localhost:8787"
  : "https://etsy-edge-api.YOUR_ACTUAL_SUBDOMAIN.workers.dev";
//                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                          Replace with the URL from above
```

## Step 3: Build & Package (~2 min)

```bash
npm run build     # Production build
npm run zip       # Creates .output/etsy-edge-0.1.0-chrome.zip
```

## Step 4: Chrome Web Store Submission (~20 min)

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
5. Upload 4-5 screenshots (take them from testing in Step 1)
6. Submit for review (typically 1-3 business days)

## Step 5: Set Up Payments (~30 min)

1. Go to https://extensionpay.com
2. Create account + register extension as `etsy-edge`
3. Set price: $9.99/month
4. Complete Stripe onboarding
5. Verify the ID matches `EXTENSION_PAY_ID` in `src/lib/payment.ts`

## Step 6: Update Marketing Site (~15 min)

After Chrome Web Store approval, you'll get a URL like:
`https://chrome.google.com/webstore/detail/etsy-edge/.../`

Replace all placeholders:
```bash
# In site/ directory, replace all href="#" with Chrome Web Store URL
# Replace all [your-email] with your actual email
# Files: site/index.html, site/privacy-policy.html, site/blog/*.html
```

Push to GitHub → GitHub Pages auto-deploys.

## Step 7: Launch Marketing

See `marketing/README.md` for the full launch sequence.

Quick version:
1. Post in r/EtsySellers, r/Etsy
2. Post on Twitter/X with demo video
3. Submit to Product Hunt
4. Cross-post to LinkedIn

---

## Troubleshooting

**Tags don't load:** Check browser console — the `extractTags()` function looks for `script[data-neu-spec-placeholder-data]` with `Listzilla_ApiSpecs_Tags_Landing` spec. Etsy may change this selector.
**AI suggestions fail:** Check OpenAI key has credits and is valid (Pro feature, requires worker)
**Worker returns 403:** Check CORS — make sure the extension ID matches
**Payment not working:** ExtensionPay requires the extension to be published in Chrome Web Store first

## Architecture

```
Chrome Extension (content script)
  ├─ DOM scraping → Tags, SEO Score, Competitor Analysis (FREE, instant)
  ├─ chrome.storage → Saves visited listing tags for competitor comparison
  └─ Background script
       ├─ Cloudflare Worker → OpenAI API (AI tag suggestions, PRO only)
       └─ ExtensionPay (payments, no backend needed)
```

Free features: Zero external dependencies. Pure DOM scraping + local scoring.
Pro features: OpenAI key on worker. Etsy API key optional (future enhancement).
