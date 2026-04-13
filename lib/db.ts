/**
 * Database utilities for card lookups
 * 
 * Hybrid mode:
 * - Production (Vercel): Uses Turso edge database
 * - Local development: Uses local SQLite file via sql.js
 * 
 * This module can only be imported in:
 * - Server Components
 * - API Routes (Route Handlers)
 * - Server Actions
 */

import { createClient, Client as TursoClient } from '@libsql/client/web'
import initSqlJs, { type SqlJsStatic, type Database as SqlJsDatabase } from 'sql.js'
import { SET_MAPPINGS } from './set-mappings'
import { SETS, getAllSetsArray } from './sets'

// Node.js modules - loaded dynamically to avoid browser bundling issues
function loadFs() {
  if (typeof window === 'undefined') {
    return require('fs')
  }
  return null
}

function loadPath() {
  if (typeof window === 'undefined') {
    return require('path')
  }
  return null
}

// Turso client (production)
let tursoClient: TursoClient | null = null

// Local SQLite (development)
let SQL: SqlJsStatic | null = null
let localDb: SqlJsDatabase | null = null

// Request counter with detailed tracking
// Use globalThis to persist across module reloads in Next.js
interface QueryStats {
  total: number
  byType: Record<string, number>
  recentQueries: Array<{ type: string; sql: string; time: string }>
}

interface GlobalStats {
  tursoRequestCount: number
  localRequestCount: number
  queryStats: QueryStats
}

// Initialize global stats store
const globalStats = (globalThis as unknown as { __dbStats?: GlobalStats }).__dbStats ?? {
  tursoRequestCount: 0,
  localRequestCount: 0,
  queryStats: {
    total: 0,
    byType: {},
    recentQueries: []
  }
}
;(globalThis as unknown as { __dbStats?: GlobalStats }).__dbStats = globalStats

export function getRequestStats() {
  return { 
    turso: globalStats.tursoRequestCount, 
    local: globalStats.localRequestCount,
    details: globalStats.queryStats
  }
}

export function resetRequestStats() {
  globalStats.tursoRequestCount = 0
  globalStats.localRequestCount = 0
  globalStats.queryStats.total = 0
  globalStats.queryStats.byType = {}
  globalStats.queryStats.recentQueries = []
}

function trackQuery(sql: string) {
  // Identify query type
  let type = 'other'
  const upperSql = sql.trim().toUpperCase()
  if (upperSql.startsWith('SELECT')) {
    if (upperSql.includes('FROM CARDS')) type = 'cards'
    else if (upperSql.includes('FROM SETS')) type = 'sets'
    else if (upperSql.includes('FROM SUBSCRIPTIONS')) type = 'subscriptions'
    else if (upperSql.includes('FROM USER_EXPORTS')) type = 'user_exports'
    else if (upperSql.includes('FROM USER_EXPORT_LIMITS')) type = 'export_limits'
    else if (upperSql.includes('FROM DECKS')) type = 'decks'
    else type = 'select_other'
  } else if (upperSql.startsWith('INSERT')) {
    type = 'insert'
  } else if (upperSql.startsWith('UPDATE')) {
    type = 'update'
  } else if (upperSql.startsWith('DELETE')) {
    type = 'delete'
  }
  
  globalStats.queryStats.total++
  globalStats.queryStats.byType[type] = (globalStats.queryStats.byType[type] || 0) + 1
  
  // Keep last 50 queries
  globalStats.queryStats.recentQueries.unshift({
    type,
    sql: sql.slice(0, 100),
    time: new Date().toISOString()
  })
  if (globalStats.queryStats.recentQueries.length > 50) {
    globalStats.queryStats.recentQueries.pop()
  }
}

/**
 * Check if running in production (Turso mode)
 */
function isTursoMode(): boolean {
  const hasUrl = !!process.env.TURSO_DATABASE_URL
  const hasToken = !!process.env.TURSO_AUTH_TOKEN
  
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DB Mode] URL: ${hasUrl ? 'yes' : 'no'}, Token: ${hasToken ? 'yes' : 'no'}, Mode: ${hasUrl && hasToken ? 'TURSO' : 'LOCAL'}`)
  }
  
  return hasUrl && hasToken
}

/**
 * Check if SQLite FTS5 is available (cards_fts table exists)
 * 
 * Uses globalThis to cache result across module reloads in Next.js dev mode
 */
export async function isFTSAvailable(): Promise<boolean> {
  if (!isTursoMode()) return false
  
  // Check cache (read from globalThis each time, not cached at module load)
  const cached = (globalThis as unknown as { __ftsAvailable?: boolean }).__ftsAvailable
  if (cached !== undefined) {
    return cached
  }
  
  try {
    const result = await executeQueryOne<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'cards_fts'",
      []
    )
    const available = !!result
    ;(globalThis as unknown as { __ftsAvailable?: boolean }).__ftsAvailable = available
    
    if (available) {
      console.log('[FTS] SQLite FTS5 detected - using optimized search')
    } else {
      console.log('[FTS] FTS5 not available - using LIKE fallback')
    }
    return available
  } catch (e) {
    console.log('[FTS] Error checking availability:', e)
    ;(globalThis as unknown as { __ftsAvailable?: boolean }).__ftsAvailable = false
    return false
  }
}

/**
 * Get Turso client (production)
 */
function getTursoClient(): TursoClient {
  if (tursoClient) return tursoClient
  
  if (!process.env.TURSO_DATABASE_URL) {
    throw new Error('TURSO_DATABASE_URL is not set')
  }
  if (!process.env.TURSO_AUTH_TOKEN) {
    throw new Error('TURSO_AUTH_TOKEN is not set')
  }
  
  tursoClient = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })
  
  return tursoClient
}

/**
 * Get database client for custom queries
 */
export function getClient(): TursoClient {
  if (isTursoMode()) {
    return getTursoClient()
  }
  throw new Error('getClient only supports Turso mode. Use specific query functions for local development.')
}

/**
 * Initialize and get local SQLite database (development)
 */
async function getLocalDbAsync(): Promise<SqlJsDatabase> {
  if (localDb) return localDb
  
  // Load Node.js modules (server-side only)
  const fs = loadFs()
  const path = loadPath()
  
  if (!fs || !path) {
    throw new Error('Local database can only be used on the server')
  }
  
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: (file) => {
        const wasmPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file)
        if (fs.existsSync(wasmPath)) {
          return wasmPath
        }
        return `https://sql.js.org/dist/${file}`
      }
    })
  }
  
  const dbPath = path.join(process.cwd(), 'cards.db')
  
  if (!fs.existsSync(dbPath)) {
    throw new Error('Database not found. Run: npx tsx scripts/init-db.ts')
  }
  
  const filebuffer = fs.readFileSync(dbPath)
  localDb = new SQL.Database(filebuffer)
  
  return localDb
}

// Initialize on module load (for local dev API routes)
let dbInitialized = false
let dbInitPromise: Promise<void> | null = null

async function ensureLocalDb(): Promise<SqlJsDatabase> {
  if (dbInitialized && localDb) return localDb
  
  if (!dbInitPromise) {
    dbInitPromise = getLocalDbAsync().then(d => {
      localDb = d
      dbInitialized = true
    })
  }
  
  await dbInitPromise
  return localDb!
}

// ============================================================================
// Database Operations (Hybrid)
// ============================================================================

/**
 * Execute a query and return rows
 */
async function executeQuery<T>(
  sql: string,
  args: (string | number)[]
): Promise<T[]> {
  if (isTursoMode()) {
    // Turso mode (production)
    globalStats.tursoRequestCount++
    const db = getTursoClient()
    
    // Track query type
    trackQuery(sql)
    
    const startTime = Date.now()
    const result = await db.execute({ sql, args })
    const duration = Date.now() - startTime
    const rowCount = result.rows.length
    
    // Always log Turso queries (for debugging)
    console.log(`[Turso Query #${globalStats.tursoRequestCount}] ${sql.slice(0, 80)}... | Rows: ${rowCount}`)
    
    return result.rows as T[]
  } else {
    // Local SQLite mode (development)
    globalStats.localRequestCount++
    const db = await ensureLocalDb()
    const result = db.exec(sql, args)
    
    if (!result.length) return []
    
    const columns = result[0].columns
    return result[0].values.map(row => {
      const obj: Record<string, unknown> = {}
      columns.forEach((col, i) => {
        obj[col] = row[i]
      })
      return obj as T
    })
  }
}

/**
 * Execute a query and return first row or undefined
 */
async function executeQueryOne<T>(
  sql: string,
  args: (string | number)[]
): Promise<T | undefined> {
  const rows = await executeQuery<T>(sql, args)
  return rows[0]
}

// ============================================================================
// Search Functions
// ============================================================================

/**
 * Parse search query with comma delimiter support
 * 
 * NOTE: Case handling is done via SQLite's case-insensitive LIKE and = COLLATE NOCASE
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
  
  // Check if matches known set name exactly (case-insensitive comparison)
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
 * Uses SQLite FTS5 when available for fast full-text search:
 * - "Char*" finds "Charizard", "Charmander", "Charizard EX" (prefix matching)
 * - BM25 ranking via fts5 rank column
 * - Case-insensitive: "charizard" matches "Charizard", "CHARIZARD"
 * - Falls back to LIKE for local SQLite
 * 
 * FTS5 Query Syntax:
 * - 'Charizard' - exact token match (case-insensitive)
 * - 'Char*' - prefix match: Charizard, Charmander, Charge
 * - 'Dark Charizard' - phrase with both tokens
 * - 'Charizard OR Pikachu' - either token
 */
export async function searchCards(
  query: string, 
  limit = 50, 
  offset = 0
): Promise<CardResult[]> {
  const parsed = parseSearchQuery(query)
  const useFTS = await isFTSAvailable()
  
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Search] Query: "${query}", Parsed:`, parsed, `FTS: ${useFTS}`)
  }
  
  let sql: string
  let args: (string | number)[]
  
  // Card name + set specified (set from dropdown = exact match)
  if (parsed.cardName && (parsed.setCode || parsed.setName)) {
    const term = parsed.cardName
    
    if (useFTS) {
      // Use FTS5 with JOIN for name search
      // Add * for prefix matching: "Char" -> "Char*" matches "Charizard", "Charmander"
      const matchTerm = term.endsWith('*') ? term : `${term}*`
      
      if (parsed.setCode) {
        sql = `
          SELECT c.* FROM cards c
          JOIN cards_fts f ON c.rowid = f.rowid
          WHERE f.cards_fts MATCH ?
            AND c.set_code = ?
          ORDER BY f.rank
          LIMIT ? OFFSET ?
        `
        args = [matchTerm, parsed.setCode, limit, offset]
      } else {
        sql = `
          SELECT c.* FROM cards c
          JOIN cards_fts f ON c.rowid = f.rowid
          WHERE f.cards_fts MATCH ?
            AND c.set_name = ?
          ORDER BY f.rank
          LIMIT ? OFFSET ?
        `
        args = [matchTerm, parsed.setName!, limit, offset]
      }
    } else {
      // Fallback to LIKE
      if (parsed.setCode) {
        sql = `
          SELECT * FROM cards 
          WHERE name LIKE ?
            AND set_code = ?
          ORDER BY CAST(local_id AS INTEGER)
          LIMIT ? OFFSET ?
        `
        args = [`%${term}%`, parsed.setCode, limit, offset]
      } else {
        sql = `
          SELECT * FROM cards 
          WHERE name LIKE ?
            AND set_name = ?
          ORDER BY CAST(local_id AS INTEGER)
          LIMIT ? OFFSET ?
        `
        args = [`%${term}%`, parsed.setName!, limit, offset]
      }
    }
  }
  // Just set code - exact match from dropdown
  else if (parsed.setCode) {
    sql = `
      SELECT * FROM cards 
      WHERE set_code = ?
      ORDER BY CAST(local_id AS INTEGER)
      LIMIT ? OFFSET ?
    `
    args = [parsed.setCode, limit, offset]
  }
  // Just set name (exact match)
  else if (parsed.setName) {
    sql = `
      SELECT * FROM cards 
      WHERE set_name = ?
      ORDER BY CAST(local_id AS INTEGER)
      LIMIT ? OFFSET ?
    `
    args = [parsed.setName, limit, offset]
  }
  // General search - card names only
  else {
    const term = parsed.cardName || ''
    
    if (useFTS) {
      // Use FTS5 with prefix matching: "Char*" finds Charizard, Charmander, etc.
      const matchTerm = term.endsWith('*') ? term : `${term}*`
      
      sql = `
        SELECT c.* FROM cards c
        JOIN cards_fts f ON c.rowid = f.rowid
        WHERE f.cards_fts MATCH ?
        ORDER BY f.rank
        LIMIT ? OFFSET ?
      `
      args = [matchTerm, limit, offset]
    } else {
      // Fallback to LIKE for local SQLite
      sql = `
        SELECT * FROM cards 
        WHERE name LIKE ?
        ORDER BY 
          CASE 
            WHEN name = ? COLLATE NOCASE THEN 0
            WHEN name LIKE ? THEN 1
            ELSE 2
          END,
          name
        LIMIT ? OFFSET ?
      `
      args = [`%${term}%`, term, `${term}%`, limit, offset]
    }
  }
  
  // Debug: Log the actual SQL being executed
  if (process.env.NODE_ENV === 'development' && useFTS) {
    console.log(`[FTS Search] SQL: ${sql.replace(/\s+/g, ' ').trim().slice(0, 100)}...`)
  }
  
  const rows = await executeQuery<CardRow>(sql, args)
  return rows.map(rowToCardResult)
}

interface SearchCursorResult {
  cards: CardResult[]
  nextCursor: string | null
  hasMore: boolean
}

/**
 * Cursor-based search for efficient pagination
 * 
 * Uses rowid-based cursor for consistent pagination.
 * For FTS5, we order by rowid to avoid issues with duplicate ranks.
 * 
 * Usage:
 *   1. First request: cursor = undefined
 *   2. Use returned nextCursor for subsequent pages
 *   3. hasMore = false when no more results
 */
export async function searchCardsCursor(
  query: string,
  limit = 30,
  cursor?: string,
  setFilter?: string
): Promise<SearchCursorResult> {
  const parsed = parseSearchQuery(query)
  const useFTS = await isFTSAvailable()
  
  // DEBUG: Log what's happening
  console.log(`[searchCardsCursor] query="${query}", useFTS=${useFTS}, cursor=${cursor}, setFilter=${setFilter}`)
  
  // For cursor pagination, we need to fetch limit+1 to determine hasMore
  const fetchLimit = limit + 1
  
  let sql: string
  let args: (string | number)[]
  
  // Build the base query
  if (parsed.cardName) {
    const term = parsed.cardName
    
    if (useFTS) {
      console.log(`[searchCardsCursor] Using FTS5 for "${term}"`)
      const matchTerm = term.endsWith('*') ? term : `${term}*`
      const cursorClause = cursor ? 'AND c.rowid > ?' : ''
      const cursorArg = cursor ? parseInt(cursor, 10) : null
      
      // NOTE: We order by rowid to ensure consistent pagination.
      // Ordering by f.rank can cause duplicates when ranks are tied.
      // The FTS5 MATCH still ensures relevant results are returned.
      if (setFilter) {
        sql = `
          SELECT c.rowid, c.* FROM cards c
          JOIN cards_fts f ON c.rowid = f.rowid
          WHERE f.cards_fts MATCH ?
            AND c.set_code = ?
            ${cursorClause}
          ORDER BY c.rowid
          LIMIT ?
        `
        args = cursorArg !== null
          ? [matchTerm, setFilter, cursorArg, fetchLimit]
          : [matchTerm, setFilter, fetchLimit]
      } else {
        sql = `
          SELECT c.rowid, c.* FROM cards c
          JOIN cards_fts f ON c.rowid = f.rowid
          WHERE f.cards_fts MATCH ?
            ${cursorClause}
          ORDER BY c.rowid
          LIMIT ?
        `
        args = cursorArg !== null
          ? [matchTerm, cursorArg, fetchLimit]
          : [matchTerm, fetchLimit]
      }
    } else {
      // Fallback to LIKE with offset (local dev)
      console.log(`[searchCardsCursor] Using LIKE fallback for "${term}"`)
      const offset = cursor ? parseInt(cursor, 10) : 0
      
      if (setFilter) {
        sql = `
          SELECT * FROM cards 
          WHERE name LIKE ?
            AND set_code = ?
          ORDER BY rowid
          LIMIT ? OFFSET ?
        `
        args = [`%${term}%`, setFilter, limit, offset]
      } else {
        sql = `
          SELECT * FROM cards 
          WHERE name LIKE ?
          ORDER BY rowid
          LIMIT ? OFFSET ?
        `
        args = [`%${term}%`, limit, offset]
      }
      
      const rows = await executeQuery<CardRow>(sql, args)
      return {
        cards: rows.map(rowToCardResult),
        nextCursor: rows.length === limit ? String(offset + limit) : null,
        hasMore: rows.length === limit
      }
    }
  } else if (parsed.setCode) {
    // Just set code - no FTS needed
    const cursorClause = cursor ? 'AND rowid > ?' : ''
    const cursorArg = cursor ? parseInt(cursor, 10) : null
    
    sql = `
      SELECT rowid, * FROM cards 
      WHERE set_code = ?
        ${cursorClause}
      ORDER BY rowid
      LIMIT ?
    `
    args = cursorArg !== null
      ? [parsed.setCode, cursorArg, fetchLimit]
      : [parsed.setCode, fetchLimit]
  } else if (parsed.setName) {
    // Set name (rare case)
    const cursorClause = cursor ? 'AND rowid > ?' : ''
    const cursorArg = cursor ? parseInt(cursor, 10) : null
    
    sql = `
      SELECT rowid, * FROM cards 
      WHERE set_name = ?
        ${cursorClause}
      ORDER BY rowid
      LIMIT ?
    `
    args = cursorArg !== null
      ? [parsed.setName, cursorArg, fetchLimit]
      : [parsed.setName, fetchLimit]
  } else {
    // No valid query
    return { cards: [], nextCursor: null, hasMore: false }
  }
  
  // Debug logging
  if (process.env.NODE_ENV === 'development' && useFTS) {
    console.log(`[FTS Cursor] cursor=${cursor}, SQL: ${sql.replace(/\s+/g, ' ').trim().slice(0, 100)}...`)
  }
  
  const rows = await executeQuery<CardRow>(sql, args)
  
  // Check if there are more results
  const hasMore = rows.length > limit
  
  // Remove the extra row we fetched to check hasMore
  const resultRows = hasMore ? rows.slice(0, limit) : rows
  
  // Get the cursor for the next page (rowid of the last result)
  const nextCursor = resultRows.length > 0 && hasMore
    ? String(resultRows[resultRows.length - 1].rowid || 0)
    : null
  
  return {
    cards: resultRows.map(rowToCardResult),
    nextCursor,
    hasMore
  }
}

/**
 * Get total count of search results (for pagination)
 * 
 * Uses pre-computed counts for set-only queries.
 * Uses FTS5 for name searches when available (much faster than LIKE).
 */
export async function searchCardsCount(query: string, setFilter?: string): Promise<number> {
  const parsed = parseSearchQuery(query)
  const useFTS = await isFTSAvailable()
  
  // Use setFilter if provided, otherwise use parsed set from query
  const effectiveSetCode = setFilter || parsed.setCode
  
  // Just set code - use pre-computed count (1 row read!) if available
  if (effectiveSetCode && !parsed.cardName) {
    try {
      const cached = await executeQueryOne<{ count_value: number }>(
        'SELECT count_value FROM card_counts WHERE count_type = ?',
        [`set:${effectiveSetCode}`]
      )
      if (cached) return cached.count_value
    } catch {
      // card_counts table doesn't exist, fall through to regular count
    }
    
    // Fallback to actual count
    const result = await executeQueryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM cards WHERE set_code = ?',
      [effectiveSetCode]
    )
    return result?.count || 0
  }
  
  let sql: string
  let args: (string | number)[]
  
  // Card name + set specified (set from dropdown or setFilter)
  if (parsed.cardName && (effectiveSetCode || parsed.setName)) {
    const term = parsed.cardName
    
    if (useFTS) {
      const matchTerm = term.endsWith('*') ? term : `${term}*`
      
      if (effectiveSetCode) {
        sql = `
          SELECT COUNT(*) as count FROM cards c
          JOIN cards_fts f ON c.rowid = f.rowid
          WHERE f.cards_fts MATCH ?
            AND c.set_code = ?
        `
        args = [matchTerm, effectiveSetCode]
      } else {
        sql = `
          SELECT COUNT(*) as count FROM cards c
          JOIN cards_fts f ON c.rowid = f.rowid
          WHERE f.cards_fts MATCH ?
            AND c.set_name = ?
        `
        args = [matchTerm, parsed.setName!]
      }
    } else {
      // Fallback to LIKE
      if (effectiveSetCode) {
        sql = `SELECT COUNT(*) as count FROM cards WHERE name LIKE ? AND set_code = ?`
        args = [`%${term}%`, effectiveSetCode]
      } else {
        sql = `SELECT COUNT(*) as count FROM cards WHERE name LIKE ? AND set_name = ?`
        args = [`%${term}%`, parsed.setName!]
      }
    }
  }
  // Just set name (exact match)
  else if (parsed.setName) {
    sql = `SELECT COUNT(*) as count FROM cards WHERE set_name = ?`
    args = [parsed.setName]
  }
  // General search - card names only
  else {
    const term = parsed.cardName || ''
    
    if (useFTS) {
      // FTS5 count uses the index - much faster than scanning
      const matchTerm = term.endsWith('*') ? term : `${term}*`
      sql = `SELECT COUNT(*) as count FROM cards_fts WHERE cards_fts MATCH ?`
      args = [matchTerm]
    } else {
      sql = `SELECT COUNT(*) as count FROM cards WHERE name LIKE ?`
      args = [`%${term}%`]
    }
  }
  
  // Debug: Log the actual SQL being executed
  if (process.env.NODE_ENV === 'development') {
    console.log(`[FTS Count] useFTS=${useFTS}, SQL: ${sql.replace(/\s+/g, ' ').trim().slice(0, 100)}...`)
  }
  
  const result = await executeQueryOne<{ count: number }>(sql, args)
  return result?.count || 0
}

/**
 * Get all cards in a specific set
 */
export async function getCardsBySet(
  setCode: string, 
  limit: number = 20, 
  offset: number = 0
): Promise<CardResult[]> {
  const sql = `
    SELECT * FROM cards 
    WHERE set_code = ?
    ORDER BY CAST(local_id AS INTEGER)
    LIMIT ? OFFSET ?
  `
  const rows = await executeQuery<CardRow>(sql, [setCode, limit, offset])
  return rows.map(rowToCardResult)
}

/**
 * Get total count of cards in a set (for pagination)
 * 
 * Uses pre-computed count from card_counts table (maintained by triggers)
 * to avoid expensive COUNT(*) query that scans all rows.
 */
export async function getCardsBySetCount(setCode: string): Promise<number> {
  // Try pre-computed count first (1 row read instead of thousands)
  try {
    const cached = await executeQueryOne<{ count_value: number }>(
      'SELECT count_value FROM card_counts WHERE count_type = ?',
      [`set:${setCode}`]
    )
    
    if (cached) {
      return cached.count_value
    }
  } catch {
    // card_counts table doesn't exist, fall through to regular count
  }
  
  // Fallback to actual count if pre-computed not available
  const result = await executeQueryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM cards WHERE set_code = ?',
    [setCode]
  )
  return result?.count || 0
}

/**
 * Get total count of all cards
 * 
 * Uses pre-computed count from card_counts table.
 */
export async function getTotalCardCount(): Promise<number> {
  try {
    const cached = await executeQueryOne<{ count_value: number }>(
      "SELECT count_value FROM card_counts WHERE count_type = 'total'",
      []
    )
    
    if (cached) {
      return cached.count_value
    }
  } catch {
    // card_counts table doesn't exist, fall through to regular count
  }
  
  const result = await executeQueryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM cards',
    []
  )
  return result?.count || 0
}

/**
 * Find a specific card by set code and local ID
 */
export async function findCard(
  setCode: string,
  localId: string
): Promise<CardResult | undefined> {
  const sql = 'SELECT * FROM cards WHERE set_code = ? AND local_id = ?'
  const row = await executeQueryOne<CardRow>(sql, [setCode, localId])
  return row ? rowToCardResult(row) : undefined
}

/**
 * Find a card by its unique ID
 */
export async function findCardById(id: string): Promise<CardResult | undefined> {
  const sql = 'SELECT * FROM cards WHERE id = ?'
  const row = await executeQueryOne<CardRow>(sql, [id])
  return row ? rowToCardResult(row) : undefined
}

/**
 * Normalize card name for search (handles apostrophes, etc.)
 */
function normalizeCardName(name: string): string {
  return name.toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
}

/**
 * Find a card for deck imports with flexible matching
 */
export async function findCardForDeck(
  name: string,
  setCode?: string,
  localId?: string
): Promise<CardResult | null> {
  const dbMode = isTursoMode() ? 'Turso' : 'Local'
  console.log(`[${dbMode} DB] Finding card: "${name}" (set: ${setCode}, localId: ${localId})`)
  
  // Priority 1: Search by name + setCode + localId
  if (name && setCode && localId) {
    const normalizedName = name.toLowerCase()
    const normalizedNameNoApostrophe = normalizeCardName(name)
    const normalizedSetCode = setCode.toUpperCase()
    
    // Try exact match first
    let sql = `SELECT * FROM cards 
               WHERE LOWER(name) = ? 
                 AND set_code = ? 
                 AND local_id = ?`
    let row = await executeQueryOne<CardRow>(sql, [normalizedName, normalizedSetCode, localId])
    
    // Try with apostrophe removed
    if (!row) {
      sql = `SELECT * FROM cards 
             WHERE REPLACE(LOWER(name), '''', '') = ? 
               AND set_code = ? 
               AND local_id = ?`
      row = await executeQueryOne<CardRow>(sql, [normalizedNameNoApostrophe, normalizedSetCode, localId])
    }
    
    // Try partial name match
    if (!row) {
      sql = `SELECT * FROM cards 
             WHERE LOWER(name) LIKE ? 
               AND set_code = ? 
               AND local_id = ?`
      row = await executeQueryOne<CardRow>(sql, [`%${normalizedName}%`, normalizedSetCode, localId])
    }
    
    // Try with padded localId
    if (!row && /^\d+$/.test(localId)) {
      const paddedLocalId = localId.padStart(3, '0')
      sql = `SELECT * FROM cards 
             WHERE (LOWER(name) LIKE ? OR REPLACE(LOWER(name), '''', '') = ?)
               AND set_code = ? 
               AND local_id = ?`
      row = await executeQueryOne<CardRow>(sql, [`%${normalizedName}%`, normalizedNameNoApostrophe, normalizedSetCode, paddedLocalId])
    }
    
    if (row) {
      console.log(`[${dbMode} DB] Found with Priority 1: ${row.name} (${row.set_code} ${row.local_id})`)
      return rowToCardResult(row)
    }
  }
  
  // Priority 2: Search by name + setCode
  if (name && setCode) {
    const normalizedName = name.toLowerCase()
    const normalizedNameNoApostrophe = normalizeCardName(name)
    const normalizedSetCode = setCode.toUpperCase()
    
    const sql = `SELECT * FROM cards 
                 WHERE (LOWER(name) LIKE ? OR REPLACE(LOWER(name), '''', '') = ?)
                   AND set_code = ?
                 ORDER BY CASE 
                   WHEN LOWER(name) = ? THEN 0 
                   WHEN REPLACE(LOWER(name), '''', '') = ? THEN 1
                   ELSE 2 
                 END
                 LIMIT 1`
    const row = await executeQueryOne<CardRow>(sql, [
      `%${normalizedName}%`, 
      normalizedNameNoApostrophe, 
      normalizedSetCode, 
      normalizedName, 
      normalizedNameNoApostrophe
    ])
    
    if (row) {
      console.log(`[${dbMode} DB] Found with Priority 2: ${row.name} (${row.set_code} ${row.local_id})`)
      return rowToCardResult(row)
    }
  }
  
  // Priority 3: Search by name only
  if (name) {
    const normalizedName = name.toLowerCase()
    const normalizedNameNoApostrophe = normalizeCardName(name)
    
    const sql = `SELECT * FROM cards 
                 WHERE LOWER(name) LIKE ? OR REPLACE(LOWER(name), '''', '') LIKE ?
                 ORDER BY 
                   CASE WHEN LOWER(name) = ? THEN 0 
                        WHEN REPLACE(LOWER(name), '''', '') = ? THEN 1
                        WHEN LOWER(name) LIKE ? THEN 2 
                        ELSE 3 
                   END,
                   name
                 LIMIT 1`
    const row = await executeQueryOne<CardRow>(sql, [
      `%${normalizedName}%`, 
      `%${normalizedNameNoApostrophe}%`, 
      normalizedName, 
      normalizedNameNoApostrophe, 
      `${normalizedName}%`
    ])
    
    if (row) {
      console.log(`[${dbMode} DB] Found with Priority 3: ${row.name} (${row.set_code} ${row.local_id})`)
      return rowToCardResult(row)
    }
  }
  
  console.log(`[${dbMode} DB] Card not found: "${name}"`)
  return null
}

/**
 * Get all available sets
 * 
 * NOTE: Uses static list to avoid expensive GROUP BY query on cards table.
 * Update lib/sets.ts when new sets are released.
 */
export async function getAllSets(): Promise<SetInfo[]> {
  // Return static list instead of querying DB (saves ~10k row reads per query)
  return getAllSetsArray().map(s => ({
    code: s.code,
    name: s.name,
    cardCount: 0 // Not used in UI, kept for type compatibility
  }))
}

// ============================================================================
// Helpers
// ============================================================================

interface CardRow {
  rowid: number | unknown
  id: string | unknown
  name: string | unknown
  set_code: string | unknown
  set_name: string | unknown
  local_id: string | unknown
  folder_name: string | unknown
  variants: string | unknown
  sizes: string | unknown
}

interface SetRow {
  set_code: string | unknown
  set_name: string | unknown
  card_count: number | unknown
}

function rowToCardResult(row: CardRow): CardResult {
  return {
    id: String(row.id),
    name: String(row.name),
    set_code: String(row.set_code),
    set_name: String(row.set_name),
    local_id: String(row.local_id),
    folder_name: String(row.folder_name),
    variants: String(row.variants),
    sizes: String(row.sizes),
  }
}

// ============================================================================
// Types
// ============================================================================

export interface CardResult {
  id: string
  name: string
  set_code: string
  set_name: string
  local_id: string
  folder_name: string
  variants: string
  sizes: string
}

export interface SetInfo {
  code: string
  name: string
  cardCount: number
}
