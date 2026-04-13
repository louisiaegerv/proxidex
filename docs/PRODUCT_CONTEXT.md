# Product Context: Proxidex

> **Elevator Pitch:** A free web app that lets Pokémon TCG players create professional-quality proxy cards for playtesting, casual games, and collecting—without buying expensive singles.

---

## What Is This App?

**Proxidex** (working name) is a browser-based tool for generating printable proxy cards for the Pokémon Trading Card Game. Users can:

- Search any card from the entire Pokémon TCG database (10,000+ cards)
- Select from multiple print sizes (small, medium, large, XL)
- Choose card variants (normal, holo, reverse holo)
- Export high-quality images formatted for home printing
- Build and save deck lists with quantities

The app is built with Next.js, uses Turso (SQLite) for the card database, and stores images in Cloudflare R2.

---

## Target Audience

### Primary Users

1. **Competitive Players**
   - Want to test tournament decks before committing $200-500 to meta cards
   - Need to practice against specific decks they don't own
   - Travel to events and want lightweight proxies for testing

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

### Secondary Users

- **Card Shop Owners** - Hosting draft events, providing playtesting stations
- **Tournament Organizers** - Running limited/draft tournaments with proxies
- **Game Designers** - Testing custom cards or fan-made sets

---

## Key Features

### Core Features (MVP - Implemented)

| Feature | Description |
|---------|-------------|
| **Card Search** | Full-text search across 10,000+ cards with FTS5 optimization |
| **Set Filtering** | Browse by specific sets (Scarlet & Violet, Obsidian Flames, etc.) |
| **Variant Selection** | Normal, Holo, Reverse Holo versions |
| **Size Options** | sm (63×88mm), md, lg, xl for different printing needs |
| **Deck Builder** | Create deck lists with quantities, save/load decks |
| **Batch Export** | Export entire deck lists as formatted images |
| **Responsive UI** | Works on desktop, tablet, mobile |

### Technical Highlights

| Feature | Benefit |
|---------|---------|
| **FTS5 Search** | Sub-100ms search across 20k cards |
| **Cursor Pagination** | Efficient infinite scroll, 99.6% fewer DB reads |
| **Image Optimization** | WebP format, multiple sizes, fast loading |
| **Hybrid DB** | Turso cloud (prod) + SQLite local (dev) |

### Premium Features (Future Roadmap)

| Feature | Description |
|---------|-------------|
| **Custom Frames** | Premium border designs, foil effects |
| **Card Alters** | Upload custom art, auto-fit to card template |
| **Bulk Printing** | PDF generation for professional printing services |
| **Deck Analytics** | Meta analysis, win rate tracking |
| **Collection Tracker** | Track owned cards vs proxies needed |
| **Tournament Legality Checker** | Validate proxies against event rules |

---

## Pain Points Solved

### For Competitive Players

**Problem:** "I want to play in a tournament next weekend, but the meta deck costs $400 and I don't know if I'll like it."

**Solution:** Print proxies for $5 in ink/paper, test the deck for a week, then decide whether to buy the real cards.

### For Budget Players

**Problem:** "My kid wants to play at locals, but Charizard ex is $80 and they might lose interest in a month."

**Solution:** Use proxies for casual play, let them experience the game without the financial barrier.

### For Content Creators

**Problem:** "I want to make a video about the 10 best decks, but I only own cards for 3 of them."

**Solution:** Generate proxies for all 10 decks, demonstrate matchups without $2,000 in cardboard.

### For Card Shops

**Problem:** "We want to run a draft event, but Pokémon doesn't make draft boosters like MTG."

**Solution:** Print proxy sets for custom draft environments, run events without sealed product costs.

---

## Value Proposition

### Compared to Buying Cards

| Aspect | Real Cards | Proxidex Proxies |
|--------|-----------|------------------|
| **Cost** | $20-200 per deck | $3-5 (ink/paper) |
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
| **Proxidex** | Free, fast, Pokémon-specific, multiple sizes, professional frames | Requires home printer or print shop |

---

## Business Model

### Current: Free Tier Only
- All features free
- Supported by optional donations/tips
- Building user base for future premium launch

### Future: Freemium Model

**Free Tier:**
- Basic card search and printing
- Standard card frames
- Limited deck slots (5 decks)

**Premium Tier ($5-10/month):**
- Unlimited deck slots
- Premium frames and effects
- Custom art upload
- Bulk PDF export
- Priority support
- Ad-free experience (if ads added)

**One-Time Purchases:**
- Premium frame packs ($2-5 each)
- Tournament pass ($10/event)
- Custom alter commissions

---

## Competitive Landscape

### Direct Competitors

| Competitor | Type | Weakness |
|------------|------|----------|
| **Pokémon TCG Live** | Official digital game | Can't print physical cards, limited deck slots |
| **MakePlayingCards (MPC)** | Print-on-demand | Expensive, slow shipping, manual process |
| **Various image sites** | Basic image downloads | No search, wrong sizes, no holo effects |

### Indirect Competitors

| Competitor | Why Users Choose Them | Our Advantage |
|------------|----------------------|---------------|
| **Buying real cards** | Tournament legality, collecting | 1/100th the cost for playtesting |
| **Tabletop Simulator** | Digital play | Proxies work for in-person events |
| **Printing plain images** | Free | Professional frames, correct sizes, faster workflow |

### Moat/Defensibility

1. **Database:** 10,000+ cards with official images (expensive to build)
2. **UX:** Purpose-built for Pokémon TCG (specific sizes, variants)
3. **Community:** Network effects from deck sharing
4. **Speed:** FTS5 search is faster than generic image hosting

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
2. Searches "charizard" on Proxidex
3. Finds Charizard ex cards, adds 4 to deck
4. Prints proxies, tests at locals
5. Wins some games, decides to buy real cards
6. Uses Proxidex for future deck testing

### Journey 2: Content Creator

1. Needs to demonstrate 5 new decks from latest set
2. Creates deck lists in Proxidex
3. Exports all 5 decks as images
4. Records gameplay video with proxies
5. Publishes video, gets questions about proxies
6. Links Proxidex in description, drives signups

### Journey 3: Parent

1. Kid wants to play at local game store
2. Sees meta deck costs $300
3. Finds Proxidex, prints proxies for $5
4. Kid plays at locals, has fun
5. Kid gets better, wants real cards for regionals
6. Buys real cards gradually while using proxies for practice

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
- [ ] Mobile app (PWA or native)
- [ ] Premium frames launch
- [ ] Referral program
- [ ] Discord community

### Medium Term (3-6 months)
- [ ] Custom art upload feature
- [ ] Collection tracker
- [ ] Deck analytics/meta insights
- [ ] Tournament organizer tools

### Long Term (6-12 months)
- [ ] Other TCGs (MTG, One Piece, Lorcana)
- [ ] Print-on-demand partnership
- [ ] Mobile game integration
- [ ] AI-powered deck recommendations

---

## Technical Context for LLMs

### When Working on Features

**Search:** Uses SQLite FTS5 with ngram tokenizer. Any changes should maintain the cursor-based pagination pattern to keep row reads low.

**Images:** Stored in Cloudflare R2. URLs follow pattern: `https://cdn.proxidex.io/cards/{folder}/{name}_{set}_{num}_{variant}_{size}.webp`

**Database:** Hybrid - Turso in production, local SQLite in development. Schema changes need to work in both.

**Auth:** Clerk for user management. Decks are currently stored locally (localStorage), eventually migrate to database.

### When Writing Marketing Copy

- Target both competitive and casual players
- Emphasize cost savings and experimentation
- Be clear about appropriate use cases (playtesting vs collecting)
- Use Pokémon TCG terminology correctly (sets, variants, rotation, etc.)

---

## Questions This Document Should Answer

1. **What is this app?** → Free proxy card generator for Pokémon TCG
2. **Who is it for?** → Competitive players, budget players, content creators
3. **Why would someone use it?** → Test decks without buying expensive cards
4. **What makes it better than alternatives?** → Free, fast, Pokémon-specific, professional quality
5. **How does it make money?** → Currently free, future premium features
6. **What's the tech stack?** → Next.js, Turso, Cloudflare R2, Clerk

---

**Last Updated:** 2026-04-12  
**Next Review:** When major features launch or pivot occurs

---

*This document is for internal context and should inform all product, marketing, and technical decisions. Keep updated as the product evolves.*
