# Etsy Edge — Chrome Extension Build Plan

## What We're Building

A Chrome extension that helps Etsy sellers optimize their listings for search. Free tier drives installs with a "tag spy" feature. Paid tier ($9.99/mo) unlocks AI-powered tag suggestions, competitor analysis, and bulk optimization.

**Name:** Etsy Edge (working title — we'll validate availability)

---

## Competitive Landscape

| Competitor | Price/mo | Has Extension? | Weakness |
|-----------|----------|---------------|----------|
| eRank | $5.99-$9.99 | Yes | Limited free tier, basic suggestions |
| Marmalead | $19 | No | No extension, expensive |
| Alura | $19.99-$49.99 | Yes | Expensive, bloated features |
| EverBee | $29.99 | Yes | Focused on sales estimates, not SEO |
| Sale Samurai | $9.99 | Yes | Dated UI, basic keyword tool |
| EtsyHunt | $3.99-$59.99 | Yes | Confusing pricing tiers |

**Our angle:** Cheaper than most ($9.99), AI-powered suggestions (not just keyword matching), lightweight (doesn't slow pages), free tag spy feature as viral hook.

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **WXT** (Vite-based) | Best MV3 framework, 40% smaller builds than Plasmo, active development |
| UI | **React + TypeScript** | Broad ecosystem, fast iteration |
| Styling | **Tailwind CSS** | Rapid UI development, small bundle |
| Background | **Service Worker** (MV3) | Required by Manifest V3 |
| Storage | **chrome.storage.local** | 10MB default, unlimited with permission |
| API calls | **Etsy Open API v3** | Tags, listing data, shop data |
| AI | **OpenAI API** (gpt-4o-mini) | Tag suggestions, SEO scoring. Cheap (~$0.15/1M input tokens) |
| Payments | **ExtensionPay** (phase 1) | Ship fast, 1-2hr integration. Migrate to Stripe later |
| Landing page | **Simple static site** | Single page for SEO + trust. Deploy on Vercel/Netlify |

---

## Architecture

```
etsy-edge/
├── src/
│   ├── entrypoints/
│   │   ├── background.ts          # Service worker — API calls, auth, payment checks
│   │   ├── content.ts             # Content script — injects UI into Etsy pages
│   │   ├── popup/                 # Extension popup
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   └── index.html
│   │   └── options/               # Settings/account page
│   │       ├── App.tsx
│   │       ├── main.tsx
│   │       └── index.html
│   ├── components/
│   │   ├── TagSpy.tsx             # Shows competitor tags on any listing
│   │   ├── SeoScore.tsx           # SEO score overlay on listing pages
│   │   ├── TagSuggestions.tsx     # AI-powered tag recommendations (paid)
│   │   ├── CompetitorPanel.tsx    # Competitor analysis sidebar (paid)
│   │   ├── BulkOptimizer.tsx      # Bulk tag/title optimizer (paid)
│   │   └── Paywall.tsx            # Upgrade prompt for free users
│   ├── lib/
│   │   ├── etsy-api.ts            # Etsy API v3 client
│   │   ├── ai-suggestions.ts     # OpenAI integration for tag suggestions
│   │   ├── seo-scorer.ts         # SEO scoring algorithm
│   │   ├── storage.ts            # Typed chrome.storage wrapper
│   │   ├── payment.ts            # ExtensionPay integration
│   │   └── extractors.ts         # DOM data extraction (JSON-LD, meta tags)
│   ├── hooks/                     # React hooks
│   │   ├── useListingData.ts
│   │   ├── useTagSuggestions.ts
│   │   └── usePaidStatus.ts
│   └── types/
│       ├── etsy.ts                # Etsy API types
│       └── extension.ts           # Extension-specific types
├── public/
│   ├── icons/                     # Extension icons (16, 32, 48, 128)
│   └── _locales/                  # i18n if needed later
├── landing/                       # Simple landing page
│   └── index.html
├── wxt.config.ts                  # WXT configuration
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## Features — Phased Rollout

### Phase 1: MVP (Week 1-2) — Ship fast, validate demand

**Free features (drive installs):**
1. **Tag Spy** — View any Etsy listing's tags. When browsing a competitor's listing, shows all 13 tags in a clean overlay. Uses Etsy API v3 `GET /v3/application/listings/{listing_id}` → `tags[]` array.
2. **Basic SEO Score** — Simple scoring of your own listings (tag count, title length, description length). Shows a letter grade A-F.

**Paid features ($9.99/mo):**
3. **AI Tag Suggestions** — Given your listing title + description + category, suggest optimized tags using GPT-4o-mini. Show what competitors ranking for similar keywords are using.
4. **Competitor Tag Analysis** — One-click: enter a keyword, see the top 20 listings and what tags they use. Find common patterns.

**Infrastructure:**
- WXT project setup with React + TypeScript + Tailwind
- Etsy API v3 integration (API key auth for public data, OAuth for seller data)
- ExtensionPay integration for subscriptions
- Chrome Web Store listing + basic landing page

### Phase 2: Growth (Week 3-4) — Based on user feedback

5. **SEO Score Pro** — Detailed scoring with specific recommendations ("Your title should lead with your primary keyword", "Tag #7 overlaps with Tag #3")
6. **Listing Optimizer** — AI rewrites your title and tags for maximum relevance. One-click apply.
7. **Shop Dashboard** — Overview of all your listings with SEO scores. Sort by worst-performing to prioritize fixes.

### Phase 3: Expansion (Month 2+)

8. **Bulk Tag Editor** — Select multiple listings, apply/remove/replace tags in bulk. Etsy's built-in bulk editor is terrible.
9. **Trending Keywords** — Monitor which search terms are gaining traction in specific categories (estimated from listing activity patterns).
10. **Alerts** — Notify when a listing's ranking drops or a competitor changes their SEO strategy.

---

## Data Flow

### Tag Spy (Free) — How it works

```
User visits any Etsy listing page
    ↓
Content script detects URL matches /listing/{id}
    ↓
Extracts listing_id from URL
    ↓
Sends message to background service worker
    ↓
Service worker calls Etsy API: GET /v3/application/listings/{listing_id}
    ↓
Returns tags[], title, views, favorites
    ↓
Content script renders TagSpy overlay on the page
```

### AI Tag Suggestions (Paid) — How it works

```
User is on their own listing editor page
    ↓
Content script extracts: title, description, category, current tags
    ↓
Sends to background service worker
    ↓
Service worker calls:
  1. Etsy API — search for similar listings, collect their tags
  2. OpenAI API — given title + description + category + competitor tags,
     suggest optimized 13-tag set with reasoning
    ↓
Returns suggested tags with explanation
    ↓
Content script renders TagSuggestions panel
  → User can one-click apply suggestions
```

---

## Etsy API Integration

**Registration:** https://etsy.com/developers/your-apps
- Need an Etsy account
- Register app, get API key (keystring)
- For reading public listings: API key only (no OAuth)
- For accessing seller's own shop data: OAuth 2.0 flow

**Key endpoints we'll use:**

| Endpoint | Auth | Use |
|----------|------|-----|
| `GET /v3/application/listings/{id}` | API key | Tag spy, competitor analysis |
| `GET /v3/application/listings/active` | API key | Search listings by keyword |
| `GET /v3/application/shops/{id}/listings` | API key | Analyze a competitor's shop |
| `GET /v3/application/shops/{id}/listings/{id}` | OAuth | Read seller's own listing details |
| `PUT /v3/application/shops/{id}/listings/{id}` | OAuth | Update tags (for one-click apply) |

**Rate limits:** 10,000 requests/day, 10 queries/second. More than enough for individual use.

---

## Payment Model

### ExtensionPay Integration (Phase 1)

```typescript
// In background.ts
import ExtPay from 'extpay';
const extpay = ExtPay('etsy-edge');
extpay.startBackground();

// Check paid status
const user = await extpay.getUser();
if (user.paid) {
  // Unlock premium features
}

// Trigger payment
extpay.openPaymentPage();
```

**Pricing:** $9.99/month
- Free tier: Tag spy + basic SEO score
- Paid tier: AI suggestions + competitor analysis + bulk tools
- 7-day free trial for paid features

**Fee:** ~8% total (Stripe 2.9% + ExtensionPay ~5%). At $9.99/mo, net ~$9.20/user/month.

### Revenue Projections (Conservative)

| Milestone | Users (free) | Paid users | MRR |
|-----------|-------------|-----------|-----|
| Month 1 | 500 | 25 (5%) | $250 |
| Month 3 | 2,000 | 100 (5%) | $1,000 |
| Month 6 | 5,000 | 300 (6%) | $3,000 |
| Month 12 | 15,000 | 1,000 (7%) | $10,000 |

These are conservative. EverBee has 200K+ users. The Etsy seller market is large.

---

## Chrome Web Store Strategy

**Listing optimization:**
- Title: "Etsy Edge — SEO Tags, Competitor Analysis & AI Optimization"
- Category: Shopping / Tools
- Screenshots: Before/after of SEO score, tag spy in action, AI suggestions
- Description: Lead with free features, mention paid features as "Pro"

**Publishing:**
- $5 one-time developer fee
- Review takes 1-3 business days
- Must have: privacy policy URL, clear permissions justification
- Permissions needed: `storage`, `activeTab`, host permission for `*.etsy.com/*`

---

## Landing Page

Simple single-page site deployed on Vercel:
- Hero: "See any Etsy listing's tags. Optimize yours with AI."
- Features section with screenshots
- Pricing (Free vs Pro)
- "Install Free" button → Chrome Web Store link
- FAQ
- Privacy policy + Terms

---

## Build Order (Implementation Steps)

### Step 1: Project scaffold
- `npx wxt@latest init etsy-edge --template react`
- Add Tailwind CSS, configure TypeScript
- Set up project structure per architecture above

### Step 2: Content script + DOM extraction
- Detect Etsy listing pages via URL matching
- Extract listing ID from URL
- Parse JSON-LD structured data from page (title, price, description)
- Render a floating button/panel on the page

### Step 3: Etsy API integration
- Register for Etsy API key
- Build typed API client (`etsy-api.ts`)
- Implement tag fetching for any listing ID
- Handle rate limiting and caching

### Step 4: Tag Spy feature (free)
- When on any listing page, fetch and display tags
- Clean UI overlay — collapsible panel, copy-to-clipboard for tags
- Cache results in chrome.storage.local to reduce API calls

### Step 5: SEO Scorer (free basic / paid detailed)
- Scoring algorithm: tag count (13 max), title length, keyword in first 40 chars, description length, tag diversity
- Display letter grade on listing pages
- Free: letter grade only. Paid: specific recommendations

### Step 6: Payment integration
- Set up ExtensionPay account
- Integrate payment checking in background service worker
- Gate paid features behind `user.paid` check
- Add upgrade prompts in UI

### Step 7: AI Tag Suggestions (paid)
- OpenAI API integration via background service worker
- Prompt engineering: given listing context + competitor tags, suggest optimized tag set
- Display suggestions with reasoning
- One-click apply (copy to clipboard initially, direct API update in Phase 2)

### Step 8: Competitor Analysis (paid)
- Search Etsy API for keyword, collect top listings
- Aggregate tag frequency across top results
- Display "most common tags for [keyword]" with frequency chart

### Step 9: Polish + publish
- Extension icons and branding
- Chrome Web Store listing with screenshots
- Privacy policy page
- Landing page
- Submit to Chrome Web Store

### Step 10: Launch + distribution
- Post on r/Etsy, r/EtsySellers (provide value, not spam)
- Etsy seller Facebook groups
- Product Hunt launch
- SEO content: "How to optimize Etsy tags" blog posts linking to extension

---

## Key Technical Decisions

1. **WXT over Plasmo** — WXT is actively maintained, Plasmo appears stalled. WXT produces smaller builds and uses Vite.

2. **Etsy API over scraping** — API provides tags reliably. Scraping is fragile and against Etsy TOS. API has generous rate limits (10K/day).

3. **GPT-4o-mini for AI features** — Cheapest model that's good enough for tag suggestions. At ~$0.15/1M input tokens, even 10K paid users generating 100 suggestions/month costs ~$15/month total.

4. **ExtensionPay first, Stripe later** — Ship in hours, not days. Migrate when revenue justifies the engineering time.

5. **No OAuth in Phase 1** — Tag spy and competitor analysis only need API key auth (public data). OAuth adds complexity. Add it in Phase 2 for "one-click apply" and shop dashboard features.

---

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Etsy API access denied/limited | Low | API is public and documented. Fallback: scrape tags from page hydration state |
| Competitors copy our features | Medium | Move fast, build community, AI quality is our moat |
| Low conversion to paid | Medium | Free tier must be genuinely useful to drive word-of-mouth. Paid features must clearly save time |
| Etsy changes page structure | Medium | Content script extraction is secondary to API. Minimal DOM dependency |
| OpenAI costs spike | Low | GPT-4o-mini is very cheap. Can also use local models or Claude API as alternatives |

---

## Success Metrics

- **Week 1:** Extension published on Chrome Web Store
- **Week 2:** 100+ installs
- **Month 1:** 500+ installs, first paying users
- **Month 3:** $1K MRR
- **Month 6:** $3K MRR
- **Month 12:** $10K MRR

---

## What You Need to Do (Non-Code)

1. **Register for Etsy API access** — https://etsy.com/developers/your-apps (need an Etsy account)
2. **Get an OpenAI API key** — https://platform.openai.com/api-keys
3. **Register Chrome Web Store developer account** — $5 one-time fee
4. **Set up ExtensionPay account** — https://extensionpay.com
5. **Write a privacy policy** — Can use a generator, needs to cover: what data we collect (listing data for analysis), what we don't collect (no personal seller data stored on our servers), third-party services (Etsy API, OpenAI API, ExtensionPay)

I (Claude Code) will handle all the code, architecture, and deployment config.
