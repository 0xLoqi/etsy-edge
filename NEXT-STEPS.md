# Etsy Edge — Next Steps

## Pull and set up on your desktop

```bash
git clone https://github.com/0xLoqi/etsy-edge.git
cd etsy-edge
nvm install 22
nvm use 22
npm install
npm run build
```

## Load the extension in Chrome

1. Open Chrome, go to `chrome://extensions`
2. Toggle **Developer mode** ON (top right)
3. Click **Load unpacked**
4. Navigate to the `etsy-edge/.output/chrome-mv3` folder and select it
5. You should see "Etsy Edge" appear in your extensions list

## Configure the extension

1. Click the Etsy Edge icon in the Chrome toolbar (puzzle piece icon → pin it)
2. Enter your **Etsy API key** (see below how to get one)
3. Click Save
4. Go to any Etsy listing page — you should see the Tag Spy panel in the bottom-right

## Get your API keys

### Etsy API Key (required for all features)
1. Go to https://www.etsy.com/developers/your-apps
2. Create a new app (any name is fine)
3. Copy the **Keystring** — that's your API key
4. Paste it into the Etsy Edge popup settings

### OpenAI API Key (required for AI suggestions — paid feature)
1. Go to https://platform.openai.com/api-keys
2. Create a new key
3. Add some credits ($5 is plenty to start — AI suggestions cost fractions of a cent)
4. Paste the key into Etsy Edge popup settings

## Set up payments (before publishing)

1. Go to https://extensionpay.com
2. Create an account
3. Create a new extension called `etsy-edge`
4. Set the price: $9.99/month
5. Follow their setup instructions to link to Stripe

## Publish to Chrome Web Store

1. Pay the $5 developer fee at https://chrome.google.com/webstore/devconsole
2. Convert SVG icons to PNG (Chrome Web Store requires PNG):
   ```bash
   npm install -D sharp-cli
   npx sharp -i public/icons/icon-128.svg -o public/icons/icon-128.png
   npx sharp -i public/icons/icon-48.svg -o public/icons/icon-48.png
   ```
3. Run `npm run zip` to create the submission ZIP
4. Upload the ZIP from `.output/` to the Chrome Web Store developer console
5. Fill in the listing details:
   - **Title:** Etsy Edge — SEO Tags & AI Optimization
   - **Summary:** See any Etsy listing's hidden tags. Optimize yours with AI.
   - **Category:** Shopping
   - **Language:** English
6. Upload screenshots (take them with the extension running on real Etsy listings)
7. Add the privacy policy URL (host `privacy-policy.html` on GitHub Pages or similar)
8. Submit for review (takes 1-3 business days)

## Development workflow

```bash
# Start dev mode with hot reload
npm run dev

# Build for production
npm run build

# Create ZIP for Chrome Web Store
npm run zip
```

When running `npm run dev`, WXT opens a Chrome instance with the extension auto-loaded. Changes hot-reload automatically.

## Distribution strategy (after publishing)

1. **Reddit** — Post helpful SEO tips (not ads) in r/Etsy, r/EtsySellers, mention the tool naturally
2. **Facebook groups** — Etsy seller groups are active and share tools
3. **Product Hunt** — Good for initial visibility burst
4. **SEO content** — Write blog posts: "How to optimize Etsy tags" with your extension as the solution
5. **YouTube** — Short tutorial showing the extension in action

## File structure reference

```
etsy-edge/
├── src/
│   ├── entrypoints/
│   │   ├── background.ts          # Service worker — API calls, payment checks
│   │   ├── content.tsx             # Injected on Etsy listing pages
│   │   └── popup/                  # Extension popup (settings)
│   ├── components/
│   │   ├── TagSpyPanel.tsx         # Main panel with tabs
│   │   ├── SeoScoreCard.tsx        # SEO grade display
│   │   └── UpgradePrompt.tsx       # Paywall prompt
│   ├── lib/
│   │   ├── etsy-api.ts            # Etsy API v3 client
│   │   ├── ai-suggestions.ts      # OpenAI integration
│   │   ├── seo-scorer.ts          # SEO scoring algorithm
│   │   ├── storage.ts             # Chrome storage wrapper
│   │   ├── payment.ts             # ExtensionPay integration
│   │   └── extractors.ts          # DOM data extraction
│   ├── hooks/
│   │   └── usePaidStatus.ts       # React hook for payment status
│   └── types/                     # TypeScript types
├── public/icons/                  # Extension icons
├── privacy-policy.html            # Privacy policy for Chrome Web Store
├── wxt.config.ts                  # WXT configuration
└── PLAN.md                        # Full build plan and architecture
```
