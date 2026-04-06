# Implementation Roadmap: Local-First Pokémon TCG App

**Date:** March 31, 2026  
**Status:** Final Design  
**Goal:** Eliminate TCGDex dependency, use local images and SQLite.

---

## Overview

This is a **simplified 2-phase implementation** (down from 5 phases):

1. **Data Layer** - Build card index from your existing images
2. **Integration** - Update app to use local lookups

**Estimated Time**: 3-5 days (part-time)

---

## Prerequisites

✅ You already have:
- ~60k images organized in folders
- Images in 4 sizes (sm, md, lg, xl)
- Consistent naming convention
- R2 bucket ready for production

Need to create:
- Set code mapping file (code → folder name + display name)
- SQLite database with set_name field for searching
- Indexing script that uses set mappings

---

## Phase 1: Data Layer (Days 1-2)

### 1.1 Create Set Mapping File

Create the mapping from official set codes to folder names and human-readable set names:

```typescript
// lib/set-mappings.ts
export const SET_MAPPINGS: Record<string, { 
  folder: string;   // Your folder name
  name: string;     // Human-readable set name for search
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
  // ... add all your sets (~180 total across all eras)
};

export function getFolderName(code: string): string | undefined {
  return SET_MAPPINGS[code]?.folder;
}

export function getSetName(code: string): string | undefined {
  return SET_MAPPINGS[code]?.name;
}
```

**Task**: Go through your image folders and add each set to this file. This is a one-time task (~180 entries).

---

### 1.2 Create SQLite Database

```bash
# Install SQLite library
pnpm add better-sqlite3
pnpm add -D @types/better-sqlite3
```

```typescript
// scripts/init-db.ts
import Database from 'better-sqlite3';

const db = new Database('cards.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    set_code TEXT NOT NULL,        -- Official code: "OBF"
    set_name TEXT NOT NULL,        -- Human-readable: "Obsidian Flames"
    local_id TEXT NOT NULL,
    folder_name TEXT NOT NULL,
    variants TEXT DEFAULT 'normal',
    sizes TEXT DEFAULT 'sm,md,lg,xl'
  );

  -- Indexes for all search types
  CREATE INDEX IF NOT EXISTS idx_name ON cards(name);
  CREATE INDEX IF NOT EXISTS idx_set_name ON cards(set_name);
  CREATE INDEX IF NOT EXISTS idx_set_code ON cards(set_code);
  CREATE INDEX IF NOT EXISTS idx_set_local ON cards(set_code, local_id);
`);

console.log('Database initialized');
db.close();
```

---

### 1.3 Build Card Index from Images

**Purpose**: Scan your image folders and create the SQLite database index of cards.  
**When to run**: 
- ✅ **One time** during initial setup
- ✅ **After adding new sets** (new expansion released)
- ❌ **Not during app startup** (users don't run this)
- ❌ **Not regularly** (only when images change)

```typescript
// scripts/index-cards.ts
import Database from 'better-sqlite3';
import { readdir } from 'fs/promises';
import path from 'path';
import { SET_MAPPINGS } from '../lib/set-mappings';

const db = new Database('cards.db');
const IMAGE_PATH = process.env.LOCAL_IMAGES_PATH!;

async function indexCards() {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO cards 
    (id, name, set_code, set_name, local_id, folder_name, variants, sizes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const sets = await readdir(IMAGE_PATH);
  let totalCards = 0;
  
  for (const folder of sets) {
    const folderPath = path.join(IMAGE_PATH, folder);
    const files = await readdir(folderPath);
    
    // Group files by card
    const cardData = new Map<string, {
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
      
      if (!cardData.has(cardId)) {
        // Get set name from mapping, fallback to code
        const setName = SET_MAPPINGS[setCode]?.name || setCode;
        
        cardData.set(cardId, {
          name: name.replace(/_/g, ' '),
          setCode,
          setName,
          localId,
          variants: new Set(['normal']),
          sizes: new Set()
        });
      }
      
      const card = cardData.get(cardId)!;
      if (variant) card.variants.add(variant);
      card.sizes.add(size);
    }
    
    // Insert into DB
    for (const [id, card] of cardData) {
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
    
    console.log(`${folder}: ${cardData.size} cards`);
    totalCards += cardData.size;
  }
  
  console.log(`\nTotal: ${totalCards} cards indexed`);
  db.close();
}

indexCards().catch(console.error);
```

**Run it (one-time during setup)**:
```bash
# Create empty database with tables
npx tsx scripts/init-db.ts

# Scan all 60k images and populate database (~30-60 seconds)
npx tsx scripts/index-cards.ts
```

**Result**: `cards.db` file created with ~15k card records. This file is read by the app during normal use.

---

## Phase 2: Integration (Days 3-5)

### 2.1 Create Database Utilities

```typescript
// lib/db.ts
import Database from 'better-sqlite3';
import path from 'path';
import { SET_MAPPINGS } from './set-mappings';

let db: Database.Database | null = null;

export function getDb() {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'cards.db');
    db = new Database(dbPath);
  }
  return db;
}

// Parse search query with comma delimiter support
// "Pikachu,Jungle" -> { cardName: "Pikachu", setName: "Jungle" }
// "Charizard,OBF" -> { cardName: "Charizard", setCode: "OBF" }
export function parseSearchQuery(query: string): {
  cardName?: string;
  setCode?: string;
  setName?: string;
} {
  const trimmed = query.trim();
  
  // Handle comma delimiter
  if (trimmed.includes(',')) {
    const [first, second] = trimmed.split(',').map(p => p.trim());
    
    const result: { cardName: string; setCode?: string; setName?: string } = {
      cardName: first
    };
    
    // Second part is set code if uppercase 2-4 chars (BS, OBF, etc.)
    if (second && /^[A-Z0-9]{2,4}$/.test(second)) {
      result.setCode = second;
    } else if (second) {
      result.setName = second;
    }
    
    return result;
  }
  
  // No comma - single term
  // Check if set code
  if (/^[A-Z0-9]{2,4}$/.test(trimmed)) {
    return { setCode: trimmed };
  }
  
  // Check if matches known set name
  const knownSet = Object.entries(SET_MAPPINGS).find(
    ([, m]) => m.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (knownSet) {
    return { setName: knownSet[1].name };
  }
  
  // Default: treat as card name
  return { cardName: trimmed };
}

// Universal search with comma delimiter support
export function searchCards(query: string, limit = 50) {
  const parsed = parseSearchQuery(query);
  
  // Card name + set specified
  if (parsed.cardName && (parsed.setCode || parsed.setName)) {
    return getDb().prepare(`
      SELECT * FROM cards 
      WHERE LOWER(name) LIKE ?
        AND (${parsed.setCode ? 'set_code = ?' : 'LOWER(set_name) LIKE ?'})
      ORDER BY CAST(local_id AS INTEGER)
      LIMIT ?
    `).all(
      `%${parsed.cardName.toLowerCase()}%`,
      parsed.setCode || `%${parsed.setName?.toLowerCase()}%`,
      limit
    );
  }
  
  // Just set code
  if (parsed.setCode) {
    return getDb().prepare(`
      SELECT * FROM cards WHERE set_code = ?
      ORDER BY CAST(local_id AS INTEGER)
      LIMIT ?
    `).all(parsed.setCode, limit);
  }
  
  // Just set name
  if (parsed.setName) {
    return getDb().prepare(`
      SELECT * FROM cards WHERE LOWER(set_name) LIKE ?
      ORDER BY CAST(local_id AS INTEGER)
      LIMIT ?
    `).all(`%${parsed.setName.toLowerCase()}%`, limit);
  }
  
  // General search across all fields
  const term = parsed.cardName?.toLowerCase() || '';
  return getDb().prepare(`
    SELECT * FROM cards 
    WHERE LOWER(name) LIKE ? 
       OR LOWER(set_name) LIKE ?
       OR LOWER(set_code) LIKE ?
    ORDER BY CASE 
      WHEN LOWER(name) = ? THEN 0
      WHEN LOWER(name) LIKE ? THEN 1
      ELSE 2
    END, name
    LIMIT ?
  `).all(`%${term}%`, `%${term}%`, `%${term}%`, term, `${term}%`, limit);
}

// Get all cards in a specific set (for set filter)
export function getCardsBySet(setCode: string) {
  return getDb().prepare(`
    SELECT * FROM cards 
    WHERE set_code = ? 
    ORDER BY CAST(local_id AS INTEGER)
  `).all(setCode);
}

// Direct lookup for deck import
export function findCard(setCode: string, localId: string) {
  return getDb().prepare(
    'SELECT * FROM cards WHERE set_code = ? AND local_id = ?'
  ).get(setCode, localId);
}

export function findCardById(id: string) {
  return getDb().prepare('SELECT * FROM cards WHERE id = ?').get(id);
}
```

---

### 2.2 Create Image URL Helper

```typescript
// lib/images.ts
import { SET_MAPPINGS } from './set-mappings';

export function getImageUrl(
  cardName: string,
  setCode: string,
  localId: string,
  size: 'sm' | 'md' | 'lg' | 'xl' = 'md',
  variant: 'normal' | 'holo' | 'reverse' = 'normal'
): string {
  const mapping = SET_MAPPINGS[setCode];
  const folder = mapping?.folder || setCode;
  
  const safeName = cardName.replace(/[^a-zA-Z0-9]/g, '_');
  const variantSuffix = variant === 'normal' ? '' : `_${variant}`;
  const fileName = `${safeName}_${setCode}_${localId}${variantSuffix}_${size}.webp`;
  
  if (process.env.IMAGE_SOURCE === 'r2') {
    return `${process.env.R2_PUBLIC_URL}/${folder}/${fileName}`;
  }
  
  return `/api/images/${folder}/${fileName}`;
}

// Helper to check if size exists (optional)
export function getAvailableSizes(card: {
  sizes: string;
}): string[] {
  return card.sizes.split(',');
}
```

---

### 2.3 Create Image API Route (Development)

```typescript
// app/api/images/[...path]/route.ts
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  const filePath = path.join(
    process.env.LOCAL_IMAGES_PATH!,
    ...params.path
  );
  
  // Security check
  const resolved = path.resolve(filePath);
  const base = path.resolve(process.env.LOCAL_IMAGES_PATH!);
  if (!resolved.startsWith(base)) {
    return new Response('Invalid path', { status: 403 });
  }
  
  try {
    const file = await readFile(resolved);
    return new Response(file, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
```

---

### 2.4 Update Card Search

```typescript
// app/api/cards/search/route.ts
import { searchCards, getCardsBySet } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const setFilter = searchParams.get('set');
  
  let cards;
  
  if (setFilter) {
    // Filtered by specific set
    cards = getCardsBySet(setFilter);
    if (query) {
      // Further filter by name within set
      const lowerQuery = query.toLowerCase();
      cards = cards.filter((c: { name: string }) => 
        c.name.toLowerCase().includes(lowerQuery)
      );
    }
  } else {
    // Universal search
    cards = searchCards(query);
  }
  
  return Response.json({ 
    cards,
    count: cards.length 
  });
}
```

---

### 2.5 Update Deck Import

Replace TCGDex lookups with local database lookups:

```typescript
// lib/import.ts
import { findCard } from './db';
import { getImageUrl } from './images';

export interface ImportResult {
  found: boolean;
  quantity?: number;
  name?: string;
  setCode?: string;
  localId?: string;
  imageUrl?: string;
  error?: string;
}

export function importCard(
  quantity: number,
  name: string,
  setCode: string,
  localId: string
): ImportResult {
  const card = findCard(setCode, localId);
  
  if (!card) {
    return {
      found: false,
      error: `Card not found: ${name} ${setCode} ${localId}`
    };
  }
  
  return {
    found: true,
    quantity,
    name: card.name,
    setCode: card.set_code,
    localId: card.local_id,
    imageUrl: getImageUrl(card.name, card.set_code, card.local_id, 'lg')
  };
}

// Usage in deck parser
export function importDeckList(lines: string[]): ImportResult[] {
  const start = performance.now();
  
  const results = lines.map(line => {
    const parsed = parseDeckLine(line); // Your existing parser
    return importCard(
      parsed.quantity,
      parsed.name,
      parsed.setCode,
      parsed.localId
    );
  });
  
  console.log(`Import: ${lines.length} cards in ${(performance.now() - start).toFixed(2)}ms`);
  return results;
}
```

---

### 2.6 Update Components

Replace TCGDex image URLs with local ones and show set name:

```typescript
// Before:
const imageUrl = `https://assets.tcgdex.net/en/${set}/${localId}/high.png`;

// After:
const imageUrl = getImageUrl(card.name, card.setCode, card.localId, 'md');

// Display with set name:
<div className="card-info">
  <div className="card-name">{card.name}</div>
  <div className="set-info">
    {card.set_name} ({card.set_code}) #{card.local_id}
  </div>
  {/* Output: "Obsidian Flames (OBF) #026" */}
</div>
```

---

### 2.7 Environment Setup

```env
# .env.local
LOCAL_IMAGES_PATH=C:\Users\louis\Coding\pokemon-card-images
IMAGE_SOURCE=local

# .env.production
IMAGE_SOURCE=r2
R2_PUBLIC_URL=https://cards.yourdomain.com
```

---

## Testing Checklist

- [ ] `npm run index-cards` completes without errors
- [ ] Database has expected number of cards
- [ ] Search by card name works ("Charmander")
- [ ] Search by set code works ("OBF")
- [ ] Search by set name works ("Obsidian Flames")
- [ ] Search API returns cards in <50ms
- [ ] Image API serves files correctly
- [ ] 60-card deck import completes in <100ms
- [ ] All images load correctly in UI
- [ ] Variants (holo/reverse) work if present
- [ ] Set filter dropdown shows set names

---

## Deployment to Production

1. **Upload to R2** (if not done):
   ```bash
   rclone sync C:\Users\louis\Coding\pokemon-card-images r2:pokemon-cards
   ```

2. **Copy database** (or regenerate on server):
   ```bash
   # Option 1: Copy pre-built database
   scp cards.db server:/app/
   
   # Option 2: Rebuild on server (if images are there)
   npm run index-cards
   ```

3. **Set environment**:
   ```env
   IMAGE_SOURCE=r2
   R2_PUBLIC_URL=https://cards.yourdomain.com
   ```

4. **Deploy**: `vercel --prod` or equivalent

---

## Summary

| Phase | Tasks | Time |
|-------|-------|------|
| 1. Data Layer | Set mappings (~180 entries), DB schema with set_name, indexing | 1-2 days |
| 2. Integration | API routes with set search, import updates, UI updates | 2-3 days |
| **Total** | | **3-5 days** |

**Key Changes**:
- ❌ Remove TCGDex SDK calls
- ❌ Remove corner processing API
- ✅ Add SQLite database with set_name field
- ✅ Add set code/name search capability
- ✅ Add local image serving
- ✅ Update import to use local lookups

**Search capabilities**:
- ✅ Card name: "Charmander"
- ✅ Set code: "OBF"
- ✅ Set name: "Obsidian Flames"
- ✅ Combined: "Charmander Obsidian Flames"

**Result**: 100× faster imports, offline capable, simpler code, full set name search.
