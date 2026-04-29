# Product Context: Proxidex

> **Elevator Pitch:** A free web app that lets Pokémon TCG players create professional-quality proxy cards for playtesting, casual games, and collecting—without buying expensive singles.

---

## What Is This App?

**Proxidex** is a browser-based tool for generating printable proxy cards for the Pokémon Trading Card Game. Users can:

- Search any card from the entire Pokémon TCG database (~20,000+ cards)
- Browse and one-click import from the top 50 meta decks on Limitless TCG
- Import any deck directly via a Limitless TCG URL
- Configure print settings (page size, grid layout, gaps, bleed, cut lines, offsets)
- Export a high-quality HTML print file that can be saved as a PDF for home or professional printing
- Build and save deck lists with quantities

The app is built with Next.js, uses Turso (SQLite) for the card database, and stores images in Cloudflare R2.

- **Landing page:** [proxidex.com](https://proxidex.com)
- **App:** [app.proxidex.com](https://app.proxidex.com)

---

## Target Audience

### Primary Users

1. **Competitive Players**
   - Want to test tournament decks before committing $200-500 to meta cards
   - Need to practice against specific decks they don't own
   - Travel to events and want lightweight proxies for testing
   - Benefit from one-click Limitless TCG meta deck imports

2. **Budget-Conscious Players**
   - Casual players who can't afford $50+ meta cards
   - Parents buying for kids who want to play competitively
   - College students on limited budgets

3. **Content Creators**
   - YouTubers/streamers demonstrating decks without owning every card
   - Writers creating strategy guides
   - Podcast hosts discussing meta

4. **Proxy Artists & Collectors**
   - People who create custom card art and want professional frames
   - Collectors who want "playable" versions of expensive cards
   - Artists selling alter commissions

5. **Proxy Card Making Companies**
   - Businesses that produce proxy cards for customers
   - Need professional print files with proper bleed and cut lines

### Secondary Users

- **Card Shop Owners** - Hosting draft events, providing playtesting stations
- **Tournament Organizers** - Running limited/draft tournaments with proxies
- **Game Designers** - Testing custom cards or fan-made sets
- **Casual Players** - Playing with friends without financial barriers

---

## Key Features

### Core Features (Implemented)

| Feature | Description |
|---------|-------------|
| **Card Search** | Full-text search across 20,000+ cards with FTS5 optimization |
| **Set Filtering** | Browse by specific sets (Scarlet & Violet, Obsidian Flames, etc.) |
| **Variant Selection** | Choose between different printings/sets for any card |
| **Deck Builder** | Create deck lists with quantities; save/load decks |
| **Limitless TCG Meta Import** | One-click import of top 50 tournament decks with deck analytics (popularity, tier position) |
| **Limitless TCG URL Import** | Paste any Limitless TCG deck URL to pull the full deck list into the print preview |
| **Print Configuration** | Customize page size (Letter/A4), grid layout (1-4 cards/row, 1-5 rows/page), gaps, bleed, cut lines, and position offsets |
| **Bleed Edge Extension** | Advanced pixel logic that extends card edges for safe cutting after printing; handles full-art borders, gradients, and complex designs—not just solid colors |
| **HTML Print File Export** | Generate a high-quality HTML print file that can be saved as a PDF for printing |
| **Image Quality Selection** | Choose image quality for the print file (medium quality free, high quality Pro) |
| **Responsive UI** | Works on desktop, tablet, mobile |

### Technical Highlights

| Feature | Benefit |
|---------|---------|
| **FTS5 Search** | Sub-100ms search across 20k cards |
| **Cursor Pagination** | Efficient infinite scroll, 99.6% fewer DB reads |
| **Image Optimization** | WebP format, multiple sizes, fast loading from R2 |
| **Hybrid DB** | Turso cloud (prod) + SQLite local (dev) |
| **Live Print Preview** | Real-time preview with drag-and-drop reordering, zoom, multi-page support, and cut line overlays |
| **Smart Deck Parsing** | Multiple fallback strategies for resolving cards from deck list text or URLs |
| **Server-Side Image Processing** | Heavy image manipulation (corners, bleed) handled via API routes to avoid browser lag |

### Premium Features (Future Roadmap)

| Feature | Description |
|---------|-------------|
| **Custom Frames** | Premium border designs, foil effects |
| **Card Alters** | Upload custom art, auto-fit to card template |
| **Collection Tracker** | Track owned cards vs proxies needed |
| **Tournament Legality Checker** | Validate proxies against event rules |
| **Mobile App** | PWA or native mobile experience |
| **Other TCGs** | MTG, One Piece, Lorcana support |
| **Print-on-Demand Partnership** | Integrated professional printing service |
| **AI-Powered Deck Recommendations** | Smart deck building suggestions |

---

## Pain Points Solved

### For Competitive Players

**Problem:** "I want to play in a tournament next weekend, but the meta deck costs $400 and I don't know if I'll like it."

**Solution:** Print proxies for $5 in ink/paper, test the deck for a week, then decide whether to buy the real cards. One-click import from Limitless TCG makes testing the latest meta effortless.

### For Budget Players

**Problem:** "My kid wants to play at locals, but Charizard ex is $80 and they might lose interest in a month."

**Solution:** Use proxies for casual play, let them experience the game without the financial barrier.

### For Content Creators

**Problem:** "I want to make a video about the 10 best decks, but I only own cards for 3 of them."

**Solution:** Generate proxies for all 10 decks, demonstrate matchups without $2,000 in cardboard.

### For Card Shops

**Problem:** "We want to run a draft event, but Pokémon doesn't make draft boosters like MTG."

**Solution:** Print proxy sets for custom draft environments, run events without sealed product costs.

### For Proxy Card Makers

**Problem:** "I need professional print files with proper bleed and cut lines for my customers."

**Solution:** Proxidex generates print-ready HTML files with advanced bleed extension, configurable layouts, and precise cut guides.

---

## Value Proposition

### Compared to Buying Cards

| Aspect | Real Cards | Proxidex Proxies |
|--------|-----------|------------------|
| **Cost** | $20-500 per deck | $3-5 (ink/paper) |
| **Time to play** | Order, ship, wait 3-7 days | Print in 10 minutes |
| **Risk** | Stuck with cards if meta changes | Zero commitment |
| **Experimentation** | Expensive to try new decks | Free to test anything |

### Compared to Other Proxy Methods

| Method | Pros | Cons |
|--------|------|------|
| **Handwritten proxies** | Free, fast | Unprofessional, hard to read |
| **Basic image printing** | Cheap | Wrong size, no holo effects, low quality |
| **MTG proxy sites** | Good quality | Don't support Pokémon TCG |
| **Professional printing** | Tournament quality | Expensive ($0.50-2 per card), slow shipping |
| **Proxidex** | Free, fast, Pokémon-specific, advanced bleed, professional print files, Limitless TCG integration | Requires home printer or print shop |

---

## Business Model

### Current: Freemium with Free Tier

**Free Tier:**
- Unlimited medium-quality HTML print file exports (`_md` images)
- Basic card search and printing
- Standard card frames
- Up to 2 saved decks (60 cards each)

**Pro Tier (planned ~$4.99/month):**
- High-quality image exports
- Unlimited saved decks
- Cloud storage for decks and settings profiles
- Turbo export speed
- Priority support
- Ad-free experience (if ads are added to free tier)


### Current Monetization Status
- No ads at the moment
- No paywalled core functionality beyond image quality, cloud storage, and deck slot limits
- Payment infrastructure still being finalized

---

## Competitive Landscape

### Direct Competitors

| Competitor | Type | Weakness |
|------------|------|----------|
| **TCG Stacked** | Deck builder, Collection tracker, Price tracker, and Proxy printer (offers set importing) for multiple TCGs including Pokemon | No direct deck import, only individual card import and set import |
| **Pokémon TCG Live** | Official digital game | Can't print physical cards, limited deck slots |
| **MakePlayingCards (MPC)** | Print-on-demand | Expensive, slow shipping, manual process |
| **Various image sites** | Basic image downloads | No search, wrong sizes, no bleed, no holo effects |

### Indirect Competitors

| Competitor | Why Users Choose Them | Our Advantage |
|------------|----------------------|---------------|
| **Buying real cards** | Tournament legality, collecting | 1/100th the cost for playtesting |
| **Tabletop Simulator** | Digital play | Proxies work for in-person events |
| **Printing plain images** | Free | Professional frames, correct sizes, advanced bleed, faster workflow |

### Moat/Defensibility

1. **Database:** 20,000+ cards with official images (expensive to build)
2. **UX:** Purpose-built for Pokémon TCG (specific sizes, variants, bleed logic)
3. **Limitless TCG Integration:** One-click meta deck import—no other proxy app provides this
4. **Community:** Network effects from deck sharing
5. **Speed:** FTS5 search is faster than generic image hosting
6. **Bleed Technology:** Advanced edge extension that handles complex borders and full-art cards

---

## Key Metrics (Current)

| Metric | Value | Notes |
|--------|-------|-------|
| **Total Cards** | 20,270 | Complete database through Journey Together |
| **Sets Supported** | 176 | All official sets |
| **Search Speed** | ~100ms | FTS5 optimized |
| **Row Reads/Search** | ~163 | Down from 40,000 (99.6% improvement) |
| **Free Tier Capacity** | 3M searches/month | On Turso free tier |
| **Paid Tier Break-even** | ~25k users | Then need $4.99/month |

---

## User Journeys

### Journey 1: New Competitive Player

1. Hears about new meta deck "Charizard ex"
2. Opens Proxidex, browses Limitless TCG meta decks
3. Finds Charizard ex in top 50, clicks one-click import
4. Reviews deck in print preview, adjusts layout if needed
5. Exports HTML print file, prints proxies
6. Tests at locals, decides whether to buy real cards
7. Uses Proxidex for future deck testing

### Journey 2: Content Creator

1. Needs to demonstrate 5 new decks from latest set
2. Imports deck lists via Limitless TCG URLs or manual entry
3. Arranges cards in print preview
4. Exports print files for all 5 decks
5. Records gameplay video with proxies
6. Publishes video, links Proxidex in description

### Journey 3: Parent

1. Kid wants to play at local game store
2. Sees meta deck costs $300
3. Finds Proxidex, prints proxies for $5
4. Kid plays at locals, has fun
5. Kid gets better, wants real cards for regionals
6. Buys real cards gradually while using proxies for practice

### Journey 4: Proxy Card Maker

1. Customer orders a custom proxy deck
2. Maker imports the deck list into Proxidex
3. Configures print settings for their specific paper and cutter
4. Exports the HTML print file with bleed and cut lines
5. Prints, cuts, and delivers professional-quality proxies

---

## Content & Messaging Guidelines

### Brand Voice

- **Helpful, not salesy:** "Here's how to test decks for less"
- **Empowering:** "Play competitively without the price barrier"
- **Community-focused:** "Built by players, for players"
- **Transparent:** Honest about what proxies can/can't do

### Key Messages

✅ **Say:**
- "Test before you invest"
- "Playtesting proxies for competitive practice"
- "Free proxy generator for Pokémon TCG"
- "Build any deck for the cost of ink"
- "One-click meta deck import from Limitless TCG"

❌ **Don't Say:**
- "Fake cards" (sounds deceptive)
- "Counterfeits" (illegal connotation)
- "Free cards" (implies unlimited real cards)
- "Tournament legal" (check specific event rules)

### Legal/Disclaimers

Always include:
- Proxies are for playtesting/casual use only
- Check with tournament organizers before using in competitive events
- Not affiliated with The Pokémon Company
- Pokémon and Pokémon TCG are trademarks of Nintendo/Creatures Inc./GAME FREAK inc.

---

## Future Roadmap

### Short Term (1-3 months)
- [ ] Payment infrastructure & Pro tier launch
- [ ] Referral program
- [ ] Discord community
- [ ] Setup promotions for new releases and legal rotation changes

### Medium Term (3-6 months)
- [ ] Custom art upload feature
- [ ] Collection tracker
- [ ] Deck analytics/meta insights beyond Limitless top 50
- [ ] Tournament organizer tools

### Long Term (6-12 months)
- [ ] Mobile app (PWA or native)
- [ ] Other TCGs (MTG, One Piece, Lorcana)
- [ ] Print-on-demand partnership (giveaways for credits to proxy printing sites)
- [ ] AI-powered deck recommendations

---

## Technical Context for LLMs

### When Working on Features

**Search:** Uses SQLite FTS5 with ngram tokenizer. Any changes should maintain the cursor-based pagination pattern to keep row reads low.

**Images:** Stored in Cloudflare R2. URLs follow pattern: `https://cdn.proxidex.io/cards/{folder}/{name}_{set}_{num}_{variant}_{size}.webp`

**Database:** Hybrid - Turso in production, local SQLite in development. Schema changes need to work in both.

**Auth:** Clerk for user management. Free users get 2 decks stored locally/cloud; Pro users get unlimited cloud-stored decks and settings profiles.

**Print Export:** The app generates an HTML print file (not individual images or direct PDF). Users save this as a PDF via their browser. Image quality is controlled by selecting `_md` (free) or `_hg` (Pro) image sizes from R2.

**Bleed Generation:** Server-side image processing via Sharp. Three methods available: Replicate, Mirror, and Edge. The Edge method uses advanced border detection and can recreate full-art borders, gradients, and complex designs—not just solid colors.

**Limitless TCG Integration:** Scrapes the current top 50 meta decks from Limitless TCG. Decks can be imported by one-click from the meta browser or by pasting any Limitless TCG deck URL.

### When Writing Marketing Copy

- Target competitive, casual, and collector audiences
- Emphasize cost savings, experimentation, and professional print quality
- Highlight the unique Limitless TCG one-click import feature
- Be clear about appropriate use cases (playtesting vs collecting)
- Use Pokémon TCG terminology correctly (sets, variants, rotation, etc.)

---

## Questions This Document Should Answer

1. **What is this app?** → Free proxy card generator for Pokémon TCG with professional print file export
2. **Who is it for?** → Competitive players, budget players, content creators, collectors, proxy makers, and casual players
3. **Why would someone use it?** → Test decks without buying expensive cards; generate print-ready files with advanced bleed and cut lines
4. **What makes it better than alternatives?** → Free, fast, Pokémon-specific, professional quality, and unique Limitless TCG meta deck integration
5. **How does it make money?** → Freemium model with Pro tier for high-quality exports, unlimited decks, and cloud storage
6. **What's the tech stack?** → Next.js, Turso, Cloudflare R2, Clerk

---

**Last Updated:** 2026-04-23
**Next Review:** When major features launch or business model changes

---

*This document is for internal context and should inform all product, marketing, and technical decisions. Keep updated as the product evolves.*
