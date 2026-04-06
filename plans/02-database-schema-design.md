# Database Schema Design for Pokémon TCG Cards

**Date:** March 31, 2026  
**Status:** Final Design  
**Database:** SQLite (local) or PostgreSQL (production)  
**Goal:** Minimal schema for card lookups without TCGDex dependency.

---

## Design Philosophy

**Minimal and pragmatic:**
- No separate tables for image sizes or variants
- Store enough to construct file paths
- Index for fast lookups by name, set name, and set+id
- Eliminate TCGDex API calls for core functionality

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       CardIndex                             │
├─────────────────────────────────────────────────────────────┤
│ id (PK)          - "MEW-063" or "OBF-026"                   │
│ name             - "Abra"                                   │
│ setCode          - "MEW" (official code)                    │
│ setName          - "151" (human-readable set name)          │
│ localId          - "063"                                    │
│ folderName       - "Pokémon_151_MEW" (your folder)                  │
│ variants         - "normal,holo,reverse"                    │
│ sizes            - "sm,md,lg,xl"                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ searches by
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Deck (Optional)                       │
├─────────────────────────────────────────────────────────────┤
│ id               - uuid                                     │
│ name             - "My Deck"                                │
│ cards            - JSON array of {cardId, qty, variant}     │
│ createdAt        - timestamp                                │
└─────────────────────────────────────────────────────────────┘
```

---

## SQLite Schema (Recommended for Simplicity)

```sql
-- cards table - single table for all lookups
CREATE TABLE cards (
  id TEXT PRIMARY KEY,           -- "MEW-063", "OBF-026"
  name TEXT NOT NULL,            -- "Abra", "Charmander"
  set_code TEXT NOT NULL,        -- "MEW", "OBF" (official abbreviation)
  set_name TEXT NOT NULL,        -- "151", "Obsidian Flames" (human-readable)
  local_id TEXT NOT NULL,        -- "063", "026"
  folder_name TEXT NOT NULL,     -- "Pokémon_151_MEW", "Obsidian_Flames_OBF"
  variants TEXT DEFAULT 'normal', -- comma-separated: "normal,holo,reverse"
  sizes TEXT DEFAULT 'sm,md,lg,xl'
);

-- Indexes for fast lookups
CREATE INDEX idx_cards_name ON cards(name);                    -- Search by card name
CREATE INDEX idx_cards_set_name ON cards(set_name);            -- Search by set name
CREATE INDEX idx_cards_set_code ON cards(set_code);            -- Search by set code
CREATE INDEX idx_cards_set_local ON cards(set_code, local_id); -- Limitless import

-- Optional: decks table for persistence
CREATE TABLE decks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cards_json TEXT NOT NULL,      -- [{"cardId":"MEW-063","qty":4,"variant":"normal"}]
  created_at INTEGER DEFAULT (unixepoch())
);
```

---

## Prisma Schema (If Using PostgreSQL)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"  // or "postgresql"
  url      = env("DATABASE_URL")
}

model Card {
  id          String   @id  // "MEW-063"
  name        String
  setCode     String   @map("set_code")
  setName     String   @map("set_name")
  localId     String   @map("local_id")
  folderName  String   @map("folder_name")
  variants    String   @default("normal")  // comma-separated
  sizes       String   @default("sm,md,lg,xl")
  
  @@index([name])
  @@index([setName])
  @@index([setCode])
  @@index([setCode, localId])
  @@map("cards")
}

model Deck {
  id          String   @id @default(uuid())
  name        String
  cardsJson   String   @map("cards_json")
  createdAt   DateTime @default(now()) @map("created_at")
  
  @@map("decks")
}
```

---

## Populating the Database

### What This Does

The `index-cards.ts` script scans your image folders and creates the SQLite database. It:
1. Reads all your `.webp` image files
2. Parses filenames to extract card name, set code, local ID, variant, and size
3. Groups multiple sizes/variants of the same card together
4. Inserts one row per unique card into the database
5. Stores the set name from your `SET_MAPPINGS` file

### When to Run

| Scenario | Run Script? |
|----------|-------------|
| **Initial setup** | ✅ Yes - one time |
| **New set added** | ✅ Yes - to index new cards |
| **Images moved/renamed** | ✅ Yes - to update paths |
| **App startup** | ❌ No - users don't run this |
| **Daily/regularly** | ❌ No - only when images change |

**This is a developer/admin script, not a user-facing feature.**

### One-Time Index Script

```typescript
// scripts/index-cards.ts
import { readdir } from 'fs/promises';
import path from 'path';
import Database from 'better-sqlite3';
import { SET_MAPPINGS } from '../lib/set-mappings';

const db = new Database('cards.db');
const IMAGE_PATH = process.env.LOCAL_IMAGES_PATH!;

async function indexCards() {
  const sets = await readdir(IMAGE_PATH);
  
  for (const folder of sets) {
    const folderPath = path.join(IMAGE_PATH, folder);
    const files = await readdir(folderPath);
    
    // Group by card (multiple sizes per card)
    const cardMap = new Map<string, {
      name: string;
      setCode: string;
      setName: string;
      localId: string;
      variants: Set<string>;
      sizes: Set<string>;
    }>();
    
    for (const file of files) {
      // Parse: Abra_MEW_063_sm.webp or Abra_MEW_063_holo_sm.webp
      const match = file.match(/^(.+?)_(\w+?)_(\d+)(?:_(holo|reverse))?_(sm|md|lg|xl)\.webp$/);
      if (!match) continue;
      
      const [, name, setCode, localId, variant, size] = match;
      const cardId = `${setCode}-${localId}`;
      
      if (!cardMap.has(cardId)) {
        // Get set name from mapping, fallback to code
        const setName = SET_MAPPINGS[setCode]?.name || setCode;
        
        cardMap.set(cardId, {
          name: name.replace(/_/g, ' '),
          setCode,
          setName,
          localId,
          variants: new Set(['normal']),
          sizes: new Set()
        });
      }
      
      const card = cardMap.get(cardId)!;
      if (variant) card.variants.add(variant);
      card.sizes.add(size);
    }
    
    // Insert into database
    const insert = db.prepare(`
      INSERT OR REPLACE INTO cards (id, name, set_code, set_name, local_id, folder_name, variants, sizes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const [id, card] of cardMap) {
      insert.run(
        id,
        card.name,
        card.setCode,
        card.setName,
        card.localId,
        folder,
        Array.from(card.variants).join(','),
        Array.from(card.sizes).join(',')
      );
    }
    
    console.log(`Indexed ${folder}: ${cardMap.size} cards`);
  }
}

indexCards();

console.log('Indexing complete! Database ready for use.');
```

### Running the Script

```bash
# One-time setup
npx tsx scripts/init-db.ts        # Create tables
npx tsx scripts/index-cards.ts    # Populate with your 60k images

# After adding new sets (e.g., new expansion released)
npx tsx scripts/index-cards.ts    # Re-run to add new cards
```

**Result**: A `cards.db` file that the app reads from (not writes to during normal use).
```

---

## Query Examples

### Search Parsing Strategy

To handle multi-word card names and set names, use **comma-delimited** search:

| User Input | Parsed As | Query |
|------------|-----------|-------|
| `Charmander` | Card name only | `name LIKE '%Charmander%'` |
| `OBF` | Set code | `set_code = 'OBF'` |
| `Obsidian Flames` | Set name (no comma) | `set_name LIKE '%Obsidian Flames%'` |
| `Pikachu,Jungle` | Card + Set | `name LIKE '%Pikachu%' AND set_name LIKE '%Jungle%'` |
| `Charizard,OBF` | Card + Set Code | `name LIKE '%Charizard%' AND set_code = 'OBF'` |
| `4 Charmander OBF 26` | Deck list format | Parsed by deck parser, not search |

**Why comma?**
- CSV format is familiar for bulk data entry
- Unambiguous separator (card names never contain commas)
- Easy to parse: `split(',')` then `trim()`

### Search Function with Comma Delimiter

```typescript
function parseSearchQuery(query: string): {
  cardName?: string;
  setCode?: string;
  setName?: string;
} {
  const trimmed = query.trim();
  
  // Check for comma delimiter
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map(p => p.trim());
    const [first, second] = parts;
    
    // First part is always card name
    // Second part could be set code or set name
    const result: { cardName: string; setCode?: string; setName?: string } = {
      cardName: first
    };
    
    // Determine if second part is set code (uppercase, 2-4 chars) or set name
    if (second && /^[A-Z0-9]{2,4}$/.test(second)) {
      result.setCode = second;
    } else if (second) {
      result.setName = second;
    }
    
    return result;
  }
  
  // No comma - single search term
  // Check if it's a set code (uppercase, 2-4 chars)
  if (/^[A-Z0-9]{2,4}$/.test(trimmed)) {
    return { setCode: trimmed };
  }
  
  // Check if it matches a known set name
  const knownSet = Object.entries(SET_MAPPINGS).find(
    ([, m]) => m.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (knownSet) {
    return { setName: knownSet[1].name };
  }
  
  // Treat as card name
  return { cardName: trimmed };
}
```

### Search by Card Name
```typescript
// Find cards matching search term
const cards = db.prepare(
  'SELECT * FROM cards WHERE name LIKE ? LIMIT 50'
).all(`%${searchTerm}%`);
```

### Search by Set Name
```typescript
// User searches "Obsidian Flames" - find all cards in that set
const cards = db.prepare(
  'SELECT * FROM cards WHERE set_name LIKE ? ORDER BY CAST(local_id AS INTEGER)'
).all(`%${setName}%`);
```

### Search by Set Code
```typescript
// User searches "OBF" - official abbreviation
const cards = db.prepare(
  'SELECT * FROM cards WHERE set_code = ? ORDER BY CAST(local_id AS INTEGER)'
).all(setCode);
```

### Universal Search (Name, Set Code, or Set Name)
```typescript
// Search across card name, set name, and set code
const cards = db.prepare(`
  SELECT * FROM cards 
  WHERE name LIKE ? 
     OR set_name LIKE ? 
     OR set_code LIKE ?
  ORDER BY 
    CASE 
      WHEN name LIKE ? THEN 0
      WHEN set_name LIKE ? THEN 1
      ELSE 2
    END,
    name
  LIMIT 50
`).all(
  `%${query}%`,    // name match
  `%${query}%`,    // set_name match
  `%${query}%`,    // set_code match
  `${query}%`,     // exact name prefix (for sorting)
  `${query}%`      // exact set_name prefix (for sorting)
);
```

### Direct Lookup (Limitless Import)
```typescript
// "4 Charmander OBF 26" → lookup OBF + 26
const card = db.prepare(
  'SELECT * FROM cards WHERE set_code = ? AND local_id = ?'
).get('OBF', '26');

// Construct image URL
const imageUrl = `${card.folder_name}/Charmander_${card.set_code}_${card.localId}_lg.webp`;
```

### Get Card with Variants
```typescript
const card = db.prepare('SELECT * FROM cards WHERE id = ?').get('MEW-063');

const variants = card.variants.split(',');  // ["normal", "holo"]
const sizes = card.sizes.split(',');        // ["sm", "md", "lg", "xl"]

// Display: "Abra (151 MEW-063)"
const displayText = `${card.name} (${card.set_name} ${card.set_code}-${card.local_id})`;
```

---

## Set Mapping File (TypeScript)

Static mappings for set code → folder and display name:

```typescript
// lib/set-mappings.ts
export const SET_MAPPINGS: Record<string, { 
  folder: string;   // Your folder name
  name: string;     // Human-readable set name
}> = {
  "BS":   { folder: "Base_Set_BS", name: "Base Set" },
  "BS2":  { folder: "Jungle_BS2", name: "Jungle" },
  "FO":   { folder: "Fossil_FO", name: "Fossil" },
  "TR":   { folder: "Team_Rocket_TR", name: "Team Rocket" },
  "MEW":  { folder: "Pokémon_151_MEW", name: "151" },
  "SV":   { folder: "Scarlet_Violet_SV", name: "Scarlet & Violet" },
  "PA":   { folder: "Paldea_Evolved_PA", name: "Paldea Evolved" },
  "OBF":  { folder: "Obsidian_Flames_OBF", name: "Obsidian Flames" },
  "TWM":  { folder: "Twilight_Masquerade_TWM", name: "Twilight Masquerade" },
  // ... add all your sets (total ~180 across all eras)
};

export function getFolderName(setCode: string): string | undefined {
  return SET_MAPPINGS[setCode]?.folder;
}

export function getSetName(setCode: string): string | undefined {
  return SET_MAPPINGS[setCode]?.name;
}
```

---

## Summary

| Component | Design |
|-----------|--------|
| **Database** | SQLite (simple) or PostgreSQL |
| **Tables** | `cards` (main), `decks` (optional) |
| **Card ID** | `{setCode}-{localId}` e.g., "MEW-063" |
| **Searchable fields** | `name`, `set_name`, `set_code` |
| **Image paths** | Constructed from `folder_name` + naming pattern |
| **Variants/sizes** | Comma-separated strings (not separate rows) |
| **Indexes** | `name`, `set_name`, `set_code`, `set_code+local_id` |
| **TCGDex** | Not needed - eliminated |
| **Set mappings** | TypeScript file (~180 entries, static) |

**Total tables: 1-2. Total indexes: 4. Total set mappings: ~180.**
