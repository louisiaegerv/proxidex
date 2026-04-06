import 'server-only'

/**
 * Database utilities for card lookups
 * 
 * This module provides functions to search and retrieve card data
 * from the local SQLite database.
 * 
 * NOTE: This module uses Node.js APIs and can only be imported in:
 * - Server Components
 * - API Routes (Route Handlers)
 * - Server Actions
 */

import initSqlJs, { type SqlJsStatic, type Database as SqlJsDatabase } from 'sql.js'
import fs from 'fs'
import path from 'path'
import { SET_MAPPINGS } from './set-mappings'

let SQL: SqlJsStatic | null = null
let db: SqlJsDatabase | null = null

/**
 * Initialize and get database instance
 */
async function getDbAsync(): Promise<SqlJsDatabase> {
  if (db) return db
  
  if (!SQL) {
    // Configure sql.js to find the wasm file correctly
    SQL = await initSqlJs({
      locateFile: (file) => {
        // In development, look in node_modules
        // In production, the wasm should be in the same directory
        const wasmPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file)
        if (fs.existsSync(wasmPath)) {
          return wasmPath
        }
        // Fallback to CDN if local file not found
        return `https://sql.js.org/dist/${file}`
      }
    })
  }
  
  const dbPath = path.join(process.cwd(), 'cards.db')
  
  if (!fs.existsSync(dbPath)) {
    throw new Error('Database not found. Run: npx tsx scripts/init-db.ts')
  }
  
  const filebuffer = fs.readFileSync(dbPath)
  db = new SQL.Database(filebuffer)
  
  return db
}

/**
 * Synchronous version for API routes (loads DB on first call)
 * Note: In production, consider caching this
 */
function getDbSync(): SqlJsDatabase {
  if (db) return db
  
  // For sync contexts, we need to have pre-initialized
  throw new Error('Database not initialized. Call initDb() first or use async functions.')
}

// Initialize on module load (for API routes)
let dbInitialized = false
let dbInitPromise: Promise<void> | null = null

async function ensureDb(): Promise<SqlJsDatabase> {
  if (dbInitialized && db) return db
  
  if (!dbInitPromise) {
    dbInitPromise = getDbAsync().then(d => {
      db = d
      dbInitialized = true
    })
  }
  
  await dbInitPromise
  return db!
}

/**
 * Parse search query with comma delimiter support
 * 
 * Examples:
 *   "Pikachu" -> { cardName: "Pikachu" }
 *   "OBF" -> { setCode: "OBF" }
 *   "Pikachu,Jungle" -> { cardName: "Pikachu", setName: "Jungle" }
 *   "Charizard, OBF" -> { cardName: "Charizard", setCode: "OBF" }
 */
export function parseSearchQuery(query: string): {
  cardName?: string
  setCode?: string
  setName?: string
} {
  const trimmed = query.trim()
  
  // Handle comma delimiter: "Pikachu,Jungle" or "Charizard, OBF"
  if (trimmed.includes(',')) {
    const [first, second] = trimmed.split(',').map(p => p.trim())
    
    const result: { cardName: string; setCode?: string; setName?: string } = {
      cardName: first
    }
    
    // Second part is set code if uppercase 2-4 chars (BS, OBF, etc.)
    if (second && /^[A-Z0-9]{2,4}$/.test(second)) {
      // Verify it's a known set code
      if (SET_MAPPINGS[second]) {
        result.setCode = second
      } else {
        // Unknown code, treat as set name
        result.setName = second
      }
    } else if (second) {
      result.setName = second
    }
    
    return result
  }
  
  // No comma - single term
  // Check if set code (uppercase, 2-4 chars)
  if (/^[A-Z0-9]{2,4}$/.test(trimmed) && SET_MAPPINGS[trimmed]) {
    return { setCode: trimmed }
  }
  
  // Check if matches known set name exactly
  const knownSet = Object.entries(SET_MAPPINGS).find(
    ([, m]) => m.name.toLowerCase() === trimmed.toLowerCase()
  )
  if (knownSet) {
    return { setName: knownSet[1].name }
  }
  
  // Default: treat as card name
  return { cardName: trimmed }
}

/**
 * Universal search with comma delimiter support
 * 
 * Search priority:
 * 1. Comma delimiter: card + set
 * 2. Set code: uppercase 2-4 chars
 * 3. Set name: exact match
 * 4. Card name (default)
 */
export async function searchCards(query: string, limit = 50): Promise<CardResult[]> {
  const database = await ensureDb()
  const parsed = parseSearchQuery(query)
  
  let sql: string
  let params: (string | number)[]
  
  // Card name + set specified
  if (parsed.cardName && (parsed.setCode || parsed.setName)) {
    if (parsed.setCode) {
      sql = `
        SELECT * FROM cards 
        WHERE LOWER(name) LIKE ?
          AND set_code = ?
        ORDER BY CAST(local_id AS INTEGER)
        LIMIT ?
      `
      params = [
        `%${parsed.cardName.toLowerCase()}%`,
        parsed.setCode,
        limit
      ]
    } else {
      sql = `
        SELECT * FROM cards 
        WHERE LOWER(name) LIKE ?
          AND LOWER(set_name) LIKE ?
        ORDER BY CAST(local_id AS INTEGER)
        LIMIT ?
      `
      params = [
        `%${parsed.cardName.toLowerCase()}%`,
        `%${parsed.setName?.toLowerCase() || ''}%`,
        limit
      ]
    }
  }
  // Just set code
  else if (parsed.setCode) {
    sql = `
      SELECT * FROM cards 
      WHERE set_code = ?
      ORDER BY CAST(local_id AS INTEGER)
      LIMIT ?
    `
    params = [parsed.setCode, limit]
  }
  // Just set name
  else if (parsed.setName) {
    sql = `
      SELECT * FROM cards 
      WHERE LOWER(set_name) LIKE ?
      ORDER BY CAST(local_id AS INTEGER)
      LIMIT ?
    `
    params = [`%${parsed.setName.toLowerCase()}%`, limit]
  }
  // General search across all fields (card name default)
  else {
    const term = parsed.cardName?.toLowerCase() || ''
    sql = `
      SELECT * FROM cards 
      WHERE LOWER(name) LIKE ? 
         OR LOWER(set_name) LIKE ?
         OR LOWER(set_code) LIKE ?
      ORDER BY 
        CASE 
          WHEN LOWER(name) = ? THEN 0
          WHEN LOWER(name) LIKE ? THEN 1
          ELSE 2
        END,
        name
      LIMIT ?
    `
    params = [
      `%${term}%`,
      `%${term}%`,
      `%${term}%`,
      term,
      `${term}%`,
      limit
    ]
  }
  
  const result = database.exec(sql, params)
  
  if (!result.length) return []
  
  // Convert result to objects
  const columns = result[0].columns
  return result[0].values.map(row => {
    const obj: Record<string, string> = {}
    columns.forEach((col, i) => {
      obj[col] = String(row[i])
    })
    return obj as unknown as CardResult
  })
}

/**
 * Get all cards in a specific set
 */
export async function getCardsBySet(setCode: string): Promise<CardResult[]> {
  const database = await ensureDb()
  
  const result = database.exec(`
    SELECT * FROM cards 
    WHERE set_code = ?
    ORDER BY CAST(local_id AS INTEGER)
  `, [setCode])
  
  if (!result.length) return []
  
  const columns = result[0].columns
  return result[0].values.map(row => {
    const obj: Record<string, string> = {}
    columns.forEach((col, i) => {
      obj[col] = String(row[i])
    })
    return obj as unknown as CardResult
  })
}

/**
 * Find a specific card by set code and local ID
 * Used for deck imports
 */
export async function findCard(
  setCode: string,
  localId: string
): Promise<CardResult | undefined> {
  const database = await ensureDb()
  
  const result = database.exec(
    'SELECT * FROM cards WHERE set_code = ? AND local_id = ?',
    [setCode, localId]
  )
  
  if (!result.length || !result[0].values.length) return undefined
  
  const columns = result[0].columns
  const row = result[0].values[0]
  const obj: Record<string, string> = {}
  columns.forEach((col, i) => {
    obj[col] = String(row[i])
  })
  
  return obj as unknown as CardResult
}

/**
 * Find a card by its unique ID
 */
export async function findCardById(id: string): Promise<CardResult | undefined> {
  const database = await ensureDb()
  
  const result = database.exec(
    'SELECT * FROM cards WHERE id = ?',
    [id]
  )
  
  if (!result.length || !result[0].values.length) return undefined
  
  const columns = result[0].columns
  const row = result[0].values[0]
  const obj: Record<string, string> = {}
  columns.forEach((col, i) => {
    obj[col] = String(row[i])
  })
  
  return obj as unknown as CardResult
}

/**
 * Normalize card name for search (handles apostrophes, etc.)
 */
function normalizeCardName(name: string): string {
  return name.toLowerCase()
    .replace(/'/g, '')  // Remove apostrophes (Boss's -> Bosss)
    .replace(/[^a-z0-9\s]/g, '')  // Remove other special chars
    .trim()
}

/**
 * Find a card for deck imports with flexible matching
 * Priority: name + setCode + localId → name + setCode → name only
 * 
 * This replaces the TCGDex findCard for deck imports
 */
export async function findCardForDeck(
  name: string,
  setCode?: string,
  localId?: string
): Promise<CardResult | null> {
  const database = await ensureDb()
  
  console.log(`[Local DB] Finding card: "${name}" (set: ${setCode}, localId: ${localId})`)
  
  // Priority 1: Search by name + setCode + localId
  if (name && setCode && localId) {
    // Normalize inputs
    const normalizedName = name.toLowerCase()
    const normalizedNameNoApostrophe = normalizeCardName(name)
    const normalizedSetCode = setCode.toUpperCase()
    
    // Try exact match first
    let result = database.exec(
      `SELECT * FROM cards 
       WHERE LOWER(name) = ? 
         AND set_code = ? 
         AND local_id = ?`,
      [normalizedName, normalizedSetCode, localId]
    )
    
    // Try with apostrophe removed (Boss's -> Bosss)
    if (!result.length || !result[0].values.length) {
      result = database.exec(
        `SELECT * FROM cards 
         WHERE REPLACE(LOWER(name), '''', '') = ? 
           AND set_code = ? 
           AND local_id = ?`,
        [normalizedNameNoApostrophe, normalizedSetCode, localId]
      )
    }
    
    // Try partial name match if exact fails
    if (!result.length || !result[0].values.length) {
      result = database.exec(
        `SELECT * FROM cards 
         WHERE LOWER(name) LIKE ? 
           AND set_code = ? 
           AND local_id = ?`,
        [`%${normalizedName}%`, normalizedSetCode, localId]
      )
    }
    
    // Try with padded localId (e.g., "95" → "095")
    if ((!result.length || !result[0].values.length) && /^\d+$/.test(localId)) {
      const paddedLocalId = localId.padStart(3, '0')
      result = database.exec(
        `SELECT * FROM cards 
         WHERE (LOWER(name) LIKE ? OR REPLACE(LOWER(name), '''', '') = ?)
           AND set_code = ? 
           AND local_id = ?`,
        [`%${normalizedName}%`, normalizedNameNoApostrophe, normalizedSetCode, paddedLocalId]
      )
    }
    
    if (result.length && result[0].values.length) {
      const columns = result[0].columns
      const row = result[0].values[0]
      const obj: Record<string, string> = {}
      columns.forEach((col, i) => {
        obj[col] = String(row[i])
      })
      console.log(`[Local DB] Found with Priority 1: ${obj.name} (${obj.set_code} ${obj.local_id})`)
      return obj as unknown as CardResult
    }
  }
  
  // Priority 2: Search by name + setCode
  if (name && setCode) {
    const normalizedName = name.toLowerCase()
    const normalizedNameNoApostrophe = normalizeCardName(name)
    const normalizedSetCode = setCode.toUpperCase()
    
    const result = database.exec(
      `SELECT * FROM cards 
       WHERE (LOWER(name) LIKE ? OR REPLACE(LOWER(name), '''', '') = ?)
         AND set_code = ?
       ORDER BY CASE 
         WHEN LOWER(name) = ? THEN 0 
         WHEN REPLACE(LOWER(name), '''', '') = ? THEN 1
         ELSE 2 
       END
       LIMIT 1`,
      [`%${normalizedName}%`, normalizedNameNoApostrophe, normalizedSetCode, normalizedName, normalizedNameNoApostrophe]
    )
    
    if (result.length && result[0].values.length) {
      const columns = result[0].columns
      const row = result[0].values[0]
      const obj: Record<string, string> = {}
      columns.forEach((col, i) => {
        obj[col] = String(row[i])
      })
      console.log(`[Local DB] Found with Priority 2: ${obj.name} (${obj.set_code} ${obj.local_id})`)
      return obj as unknown as CardResult
    }
  }
  
  // Priority 3: Search by name only
  if (name) {
    const normalizedName = name.toLowerCase()
    const normalizedNameNoApostrophe = normalizeCardName(name)
    
    const result = database.exec(
      `SELECT * FROM cards 
       WHERE LOWER(name) LIKE ? OR REPLACE(LOWER(name), '''', '') LIKE ?
       ORDER BY 
         CASE WHEN LOWER(name) = ? THEN 0 
              WHEN REPLACE(LOWER(name), '''', '') = ? THEN 1
              WHEN LOWER(name) LIKE ? THEN 2 
              ELSE 3 
         END,
         name
       LIMIT 1`,
      [`%${normalizedName}%`, `%${normalizedNameNoApostrophe}%`, normalizedName, normalizedNameNoApostrophe, `${normalizedName}%`]
    )
    
    if (result.length && result[0].values.length) {
      const columns = result[0].columns
      const row = result[0].values[0]
      const obj: Record<string, string> = {}
      columns.forEach((col, i) => {
        obj[col] = String(row[i])
      })
      console.log(`[Local DB] Found with Priority 3: ${obj.name} (${obj.set_code} ${obj.local_id})`)
      return obj as unknown as CardResult
    }
  }
  
  console.log(`[Local DB] Card not found: "${name}"`)
  return null
}

/**
 * Get all available sets
 */
export async function getAllSets(): Promise<SetInfo[]> {
  const database = await ensureDb()
  
  const result = database.exec(`
    SELECT set_code, set_name, COUNT(*) as card_count
    FROM cards
    GROUP BY set_code
    ORDER BY set_name
  `)
  
  if (!result.length) return []
  
  const columns = result[0].columns
  return result[0].values.map(row => ({
    code: String(row[0]),
    name: String(row[1]),
    cardCount: Number(row[2])
  }))
}

// ============================================================================
// Types
// ============================================================================

export interface CardResult {
  id: string           // "MEW-063"
  name: string         // "Abra"
  set_code: string     // "MEW"
  set_name: string     // "151"
  local_id: string     // "063"
  folder_name: string  // "151_MEW"
  variants: string     // "normal,holo"
  sizes: string        // "sm,md,lg,xl"
}

export interface SetInfo {
  code: string
  name: string
  cardCount: number
}
