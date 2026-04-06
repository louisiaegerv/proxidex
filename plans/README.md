# Proxidex Local-First Architecture

**Project**: Proxidex - Pokémon TCG Proxy Card Generator  
**Date**: March 31, 2026  
**Status**: Final Design - Ready for Implementation

---

## Quick Summary

Transform the app to use **local images** and **SQLite database** instead of TCGDex API. This eliminates network dependencies and provides 100× performance improvement.

### Before (Current)
- Card search: TCGDex API (~300ms)
- Image loading: TCGDex CDN (~200ms)
- Deck import: 60 API calls (~5 seconds)
- Corner processing: Real-time server-side

### After (New Design)
- Card search: SQLite query (~2ms) - search by name, set code, OR set name
- Image loading: Local files (~3ms) / R2 (~20ms)
- Deck import: 60 local lookups (~50ms)
- Corner processing: Pre-processed images

---

## Your Current Assets (Unchanged)

You already have everything needed:

```
C:\Users\louis\Coding\pokemon-card-images\
├── Pokémon_151_MEW/
│   ├── Abra_MEW_063_sm.webp
│   ├── Abra_MEW_063_md.webp
│   ├── Abra_MEW_063_lg.webp
│   └── Abra_MEW_063_xl.webp
├── Base_Set_BS/
├── Obsidian_Flames_OBF/
└── ... (60k+ images)
```

**File naming**: `{Name}_{SetCode}_{LocalId}_{Variant?}_{Size}.webp`  
**Sizes**: sm (288x400), md (575x800), lg (1150x1600), xl (1472x2048)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  User Browser                                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Search "Pikachu" → SQLite query (2ms)               │  │
│  │  Search "OBF" → Find Obsidian Flames cards           │  │
│  │  Search "Obsidian Flames" → Same result              │  │
│  │  Load deck → 60 local lookups (50ms)                 │  │
│  │  Show images → /api/images/... (3ms)                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Next.js App                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ /api/cards/  │  │ /api/images/ │  │ Deck Import      │  │
│  │ search       │  │ [...path]    │  │ (local only)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
           │                │
           ▼                ▼
┌──────────────────┐ ┌──────────────────────────────┐
│  SQLite          │ │  Local Files / R2 Bucket     │
│  cards.db        │ │  6GB WebP images             │
│                  │ │                              │
│  ~15k rows       │ │  Pre-processed, ready to use │
│  Indexed by:     │ │  No downloads needed         │
│  - name          │ │                              │
│  - set_name      │ │  R2: cards.yourdomain.com    │
│  - set_code      │ │                              │
│  - set+localId   │ │                              │
└──────────────────┘ └──────────────────────────────┘
```

---

## Key Components

### 1. Set Mappings

Map official set codes to folder names and human-readable set names:

```typescript
// lib/set-mappings.ts
export const SET_MAPPINGS = {
  "BS":  { folder: "Base_Set_BS", name: "Base Set" },
  "BS2": { folder: "Jungle_BS2", name: "Jungle" },
  "MEW": { folder: "Pokémon_151_MEW", name: "151" },
  "OBF": { folder: "Obsidian_Flames_OBF", name: "Obsidian Flames" },
  "SV":  { folder: "Scarlet_Violet_SV", name: "Scarlet & Violet" },
  // ... ~180 sets total
};
```

### 2. SQLite Database

Single table with set name for flexible search:

```sql
CREATE TABLE cards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  set_code TEXT NOT NULL,
  set_name TEXT NOT NULL,
  local_id TEXT NOT NULL,
  folder_name TEXT NOT NULL,
  variants TEXT,
  sizes TEXT
);

CREATE INDEX idx_name ON cards(name);
CREATE INDEX idx_set_name ON cards(set_name);
CREATE INDEX idx_set_code ON cards(set_code);
CREATE INDEX idx_set_local ON cards(set_code, local_id);
```

### 3. Universal Search

```typescript
export function searchCards(query: string) {
  return db.prepare(`
    SELECT * FROM cards 
    WHERE name LIKE ? 
       OR set_name LIKE ?
       OR set_code LIKE ?
  `).all(`%${query}%`, `%${query}%`, `%${query}%`);
}
```

### 4. Image URL Generation

```typescript
function getImageUrl(card, size = "md", variant = "normal") {
  const folder = SET_MAPPINGS[card.setCode].folder;
  const variantSuffix = variant === "normal" ? "" : `_${variant}`;
  const fileName = `${card.name}_${card.setCode}_${card.localId}${variantSuffix}_${size}.webp`;
  
  if (process.env.IMAGE_SOURCE === "r2") {
    return `${R2_URL}/${folder}/${fileName}`;
  }
  return `/api/images/${folder}/${fileName}`;
}
```

---

## Search Capabilities

| Search Query | Finds | Example |
|--------------|-------|---------|
| Card name | Cards with matching name | `Charmander` → all Charmanders |
| Set code | Cards in that set | `OBF` → all Obsidian Flames |
| Set name | Cards in that set | `Obsidian Flames` → same as OBF |
| **Card + Set (comma)** | Specific card in set | `Pikachu,Jungle` → Pikachus in Jungle |
| **Card + Set Code** | Card with set code | `Charizard,OBF` → Charizards in OBF |
| Partial match | Fuzzy matches | `Char` → Charizard, Charmander, etc. |

### Comma Delimiter for Multi-Word Searches

Use a comma to separate **card name** from **set name/code**:

```
Pikachu,Jungle          → Pikachu cards in Jungle set
Charizard, Obsidian     → Charizard cards in Obsidian Flames
Mewtwo,BS               → Mewtwo cards in Base Set
```

**Why comma?**
- CSV format is familiar for bulk data entry
- Card names never contain commas (safe delimiter)
- Easy to parse: `split(',')` then `trim()`
- Handles multi-word card names: `Mr. Mime,MEW`

---

## Documents

| Document | Description |
|----------|-------------|
| [01-image-storage-strategy.md](./01-image-storage-strategy.md) | Keep your current file structure |
| [02-database-schema-design.md](./02-database-schema-design.md) | SQLite schema with set_name field |
| [03-api-integration-strategy.md](./03-api-integration-strategy.md) | No TCGDex, local-only lookups |
| [04-implementation-roadmap.md](./04-implementation-roadmap.md) | 3-5 day implementation plan |

---

## Implementation Timeline

| Day | Task | Output |
|-----|------|--------|
| 1 | Create set mappings (~180 entries) | `lib/set-mappings.ts` |
| 1 | Init SQLite database | `cards.db` schema with set_name |
| 2 | Build indexing script | `scripts/index-cards.ts` |
| 2 | Run indexing | Populated database |
| 3 | Create image API route | `/api/images/[...path]` |
| 3 | Create search API with set support | `/api/cards/search` |
| 4 | Update deck import | Local lookups only |
| 4 | Update components | Use new image URLs |
| 5 | Test & deploy | Working production app |

**Total: 3-5 days**

---

## Performance Expectations

| Operation | Before (TCGDex) | After (Local) | Speedup |
|-----------|-----------------|---------------|---------|
| Card search | 300ms | 2ms | 150× |
| Set search (code) | 300ms | 2ms | 150× |
| Set search (name) | N/A | 2ms | New feature! |
| Image load | 200ms | 3ms | 67× |
| Deck import (60 cards) | 5s | 50ms | 100× |

---

## What We're Removing

- ❌ TCGDex SDK dependency
- ❌ TCGDex API calls
- ❌ Corner processing API
- ❌ Image download/processing overhead

## What We're Adding

- ✅ SQLite database with set_name field
- ✅ Set code mapping file (~180 entries)
- ✅ Universal search (card name, set code, set name)
- ✅ Local image API route

---

## Next Steps

1. ✅ Review updated plans
2. Create `lib/set-mappings.ts` with your ~180 set codes
3. Initialize SQLite database
4. Run indexing script on your images
5. Build API routes with set name search
6. Update app to use local lookups
