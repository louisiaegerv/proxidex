/**
 * User export tracking system
 * 
 * Exports are unlimited for all authenticated users.
 * Pro features: cloud storage, unlimited decks, high quality exports.
 * 
 * This module still records exports for analytics but no longer enforces limits.
 */

import { getClient } from "./db"

// Legacy constants (kept for backward compatibility, no longer enforced)
export const FREE_TIER_DAILY_LIMIT = 2
export const FREE_TIER_DECK_MAX_CARDS = 60
export const WELCOME_EXPORT_CREDITS = 5
export const TURBO_EXPORT_LIMIT = 3

// Data retention for daily exports analytics
export const EXPORT_RETENTION_DAYS = 730

interface DailyExportRecord {
  user_id: string
  date: string // YYYY-MM-DD
  count: number
  created_at: string
}

interface UserExportLimits {
  user_id: string
  welcome_credits_used: number
  turbo_exports_used: number
  created_at: string
  updated_at: string
}

/**
 * Get today's export count from user_exports table
 */
async function getTodayExportCount(userId: string): Promise<number> {
  const db = getClient()
  const today = new Date().toISOString().split("T")[0]

  const result = await db.execute({
    sql: `SELECT count FROM user_exports WHERE user_id = ? AND date = ?`,
    args: [userId, today],
  })

  return result.rows.length > 0 ? Number(result.rows[0].count) : 0
}

/**
 * Get or create user export limits record (legacy, kept for analytics compatibility)
 */
async function getOrCreateUserLimits(userId: string): Promise<UserExportLimits> {
  const db = getClient()

  const result = await db.execute({
    sql: `SELECT * FROM user_export_limits WHERE user_id = ?`,
    args: [userId],
  })

  if (result.rows.length > 0) {
    const row = result.rows[0]
    return {
      user_id: userId,
      welcome_credits_used: Number(row.welcome_credits_used),
      turbo_exports_used: Number(row.turbo_exports_used),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    }
  }

  await db.execute({
    sql: `
      INSERT INTO user_export_limits 
      (user_id, welcome_credits_used, turbo_exports_used)
      VALUES (?, 0, 0)
    `,
    args: [userId],
  })

  return {
    user_id: userId,
    welcome_credits_used: 0,
    turbo_exports_used: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

/**
 * Check if user can export
 * All authenticated users can export unlimited times.
 */
export async function canUserExport(_userId: string, _isPro: boolean = false): Promise<boolean> {
  return true
}

/**
 * Check if user can use turbo fast export
 * All authenticated users can use turbo.
 */
export async function canUseTurboExport(_userId: string, _isPro: boolean = false): Promise<boolean> {
  return true
}

/**
 * Increment today's export count in user_exports table
 * Records ALL exports for analytics
 */
async function incrementDailyExport(userId: string): Promise<void> {
  const db = getClient()
  const today = new Date().toISOString().split("T")[0]

  await db.execute({
    sql: `
      INSERT INTO user_exports (user_id, date, count)
      VALUES (?, ?, 1)
      ON CONFLICT(user_id, date)
      DO UPDATE SET count = count + 1, created_at = CURRENT_TIMESTAMP
    `,
    args: [userId, today],
  })
}

/**
 * Record an export for the user
 * Always records analytics. Limits are no longer enforced.
 */
export async function recordExport(userId: string, _isPro: boolean = false): Promise<"pro"> {
  await incrementDailyExport(userId)
  return "pro"
}

/**
 * Record a turbo export trial (legacy, no longer limits)
 */
export async function recordTurboTrial(_userId: string): Promise<boolean> {
  return true
}

/**
 * Get remaining exports for user
 * Returns unlimited for all users.
 */
export async function getRemainingExports(_userId: string, _isPro: boolean = false): Promise<{
  daily: number
  welcome: number
  turboRemaining: number
  total: number
}> {
  return {
    daily: Infinity as unknown as number,
    welcome: Infinity as unknown as number,
    turboRemaining: Infinity as unknown as number,
    total: Infinity as unknown as number,
  }
}

/**
 * Get full user export limits (for API responses)
 * Returns unlimited for all users.
 */
export async function getUserExportLimits(_userId: string, _isPro: boolean = false): Promise<{
  dailyUsed: number
  dailyLimit: number
  welcomeUsed: number
  welcomeLimit: number
  turboUsed: number
  turboLimit: number
  isPro: boolean
}> {
  return {
    dailyUsed: 0,
    dailyLimit: Infinity as unknown as number,
    welcomeUsed: 0,
    welcomeLimit: Infinity as unknown as number,
    turboUsed: 0,
    turboLimit: Infinity as unknown as number,
    isPro: true,
  }
}

/**
 * Create the user_export_limits table (run once during setup)
 */
export async function createExportLimitsTable(): Promise<void> {
  const db = getClient()

  await db.execute({
    sql: `
      CREATE TABLE IF NOT EXISTS user_export_limits (
        user_id TEXT PRIMARY KEY,
        welcome_credits_used INTEGER DEFAULT 0,
        turbo_exports_used INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    args: [],
  })

  await db.execute({
    sql: `CREATE INDEX IF NOT EXISTS idx_export_limits_user ON user_export_limits(user_id)`,
    args: [],
  })
}

/**
 * Create the exports table (for fresh installs)
 */
export async function createExportsTable(): Promise<void> {
  const db = getClient()

  await db.execute({
    sql: `
      CREATE TABLE IF NOT EXISTS user_exports (
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        count INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, date)
      )
    `,
    args: [],
  })

  await db.execute({
    sql: `CREATE INDEX IF NOT EXISTS idx_exports_user_date ON user_exports(user_id, date)`,
    args: [],
  })
}

/**
 * Create all export-related tables
 */
export async function createAllExportTables(): Promise<void> {
  await createExportsTable()
  await createExportLimitsTable()
}

/**
 * Cleanup old export entries
 */
export async function cleanupOldExports(retentionDays: number = EXPORT_RETENTION_DAYS): Promise<number> {
  if (retentionDays <= 0) {
    console.log("[cleanup] Retention disabled - keeping all export history")
    return 0
  }

  const db = getClient()

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
  const cutoffStr = cutoffDate.toISOString().split("T")[0]

  const result = await db.execute({
    sql: `DELETE FROM user_exports WHERE date < ?`,
    args: [cutoffStr],
  })

  const deletedCount = result.rowsAffected || 0
  console.log(`[cleanup] Deleted ${deletedCount} old export records (older than ${cutoffDate.toISOString().split("T")[0]})`)

  return deletedCount
}

/**
 * Lightweight cleanup - only deletes very old entries (> 1 year)
 */
export async function cleanupVeryOldExports(): Promise<void> {
  const db = getClient()

  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  const cutoffStr = oneYearAgo.toISOString().split("T")[0]

  await db.execute({
    sql: `DELETE FROM user_exports WHERE date < ?`,
    args: [cutoffStr],
  })
}
