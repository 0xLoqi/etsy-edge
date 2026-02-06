# Etsy Edge — Next Steps

## Where You Are

The extension is built and the full growth stack (site, blog, marketing content, outreach system) is ready. Here's what to do next, in order.

---

## Phase 1: Get the Extension Published

### 1. Set up API keys
- **Etsy API**: https://www.etsy.com/developers/your-apps → Create app → copy Keystring
- **OpenAI API**: https://platform.openai.com/api-keys → Create key → add $5 credits

### 2. Set up payments
1. Go to https://extensionpay.com
2. Create an account, create extension called `etsy-edge`
3. Set price: $9.99/month
4. Follow their Stripe setup instructions

### 3. Publish to Chrome Web Store
1. Pay the $5 developer fee at https://chrome.google.com/webstore/devconsole
2. Run `npm run zip` to create the submission ZIP
3. Upload the ZIP from `.output/`
4. Fill in listing details:
   - **Title:** Etsy Edge — SEO Tags & AI Optimization
   - **Summary:** See any Etsy listing's hidden tags. Optimize yours with AI.
   - **Category:** Shopping
   - **Language:** English
5. Take screenshots of the extension on real Etsy listings (Tag Spy, SEO Score, AI Suggestions, Competitor Analysis)
6. Set privacy policy URL to `https://etsyedge.app/privacy-policy.html`
7. Submit for review (1-3 business days)

---

## Phase 2: Deploy the Website

### 1. Push to GitHub
```bash
git push origin main
```

### 2. Enable GitHub Pages
1. Go to https://github.com/0xloqi/etsy-edge/settings/pages
2. Source: **Deploy from a branch**
3. Branch: **main**, folder: **/site** (not /docs, not root — select /site if available, otherwise see note below)
4. Save

> **Note:** GitHub Pages only offers root (`/`) or `/docs` as folder options. If `/site` isn't available, you have two options:
> - Rename `site/` to `docs/` and select `/docs`
> - Use a GitHub Actions workflow to deploy from `site/`

### 3. Replace placeholders
Once published, find-and-replace across all files:
- `[your-email]` → your actual contact email
- `href="#"` (Chrome Web Store CTAs) → actual Chrome Web Store URL

```bash
# Find all files with placeholders
grep -r "\[your-email\]" site/ marketing/
grep -r 'href="#"' site/
```

### 4. Verify the live site
- Open https://etsyedge.app/
- Check all nav links work
- Check blog articles load
- Check privacy policy loads
- Test on mobile

---

## Phase 3: Launch (Week 1)

Follow the timeline in `marketing/README.md`. Here's the sequence:

| Day | Action | File |
|-----|--------|------|
| Mon | Post value post to r/Etsy | `marketing/reddit/value-post-r-etsy.md` |
| Tue | Post launch to r/EtsySellers | `marketing/reddit/launch-post-r-etsysellers.md` |
| Tue | Post Twitter launch thread | `marketing/twitter/launch-thread.md` |
| Wed | Launch on Product Hunt | `marketing/producthunt/launch-copy.md` |
| Thu | Post builder story to r/smallbusiness | `marketing/reddit/builder-story-r-smallbusiness.md` |
| Fri | Post in 2-3 Facebook groups | `marketing/facebook/group-post-template.md` |

**Before launch day:**
- [ ] Join 5-8 Facebook groups and engage for a week first (see `marketing/facebook/target-groups.md`)
- [ ] Have 5-10 people ready to upvote Product Hunt on launch day
- [ ] Record the YouTube demo video (see `marketing/youtube/demo-script.md`)

---

## Phase 4: Ongoing Growth (Week 2+)

### Weekly routine (~30 min/day)
- **Outreach**: 5 new contacts + 5 follow-ups per week (see `marketing/outreach/tracking/weekly-workflow.md`)
- **Twitter**: 3-5 tweets/week from `marketing/twitter/ongoing-content.md`
- **Reddit**: 1 helpful comment/day using `marketing/reddit/comment-templates.md`
- **Facebook**: 1 group post per week

### Monthly
- Write 1 new blog post (add to `site/blog/` and update `sitemap.xml`)
- Review Chrome Web Store analytics — which keywords drive installs?
- Review outreach tracker — which channels produce reviews?
- Double down on what's working, cut what isn't

---

## File Structure Reference

```
etsy-edge/
├── src/                              # Extension source code
├── site/                             # Marketing website (GitHub Pages)
│   ├── index.html                    # Landing page
│   ├── privacy-policy.html           # Privacy policy
│   ├── robots.txt & sitemap.xml      # SEO infra
│   ├── assets/style.css              # Shared styles
│   └── blog/                         # 7 SEO articles + index
├── marketing/                        # Launch content & outreach
│   ├── README.md                     # Launch timeline & checklist
│   ├── reddit/                       # 3 posts + comment templates
│   ├── producthunt/                  # Launch copy + hunter outreach
│   ├── facebook/                     # Post templates + group list
│   ├── twitter/                      # Launch thread + 20 content ideas
│   ├── youtube/                      # Demo script + Shorts script
│   └── outreach/                     # Email templates, guides, tracker
├── public/icons/                     # Extension icons (SVG + PNG)
├── README.md                         # Project README
├── PLAN.md                           # Original build plan
├── NEXT-STEPS.md                     # ← You are here
├── wxt.config.ts                     # WXT configuration
└── package.json
```

## Development Workflow

```bash
npm run dev      # Dev mode with hot reload
npm run build    # Production build
npm run zip      # Chrome Web Store ZIP
```
