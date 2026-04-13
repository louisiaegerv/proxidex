/**
 * User export tracking system
 * 
 * Free tier (Trainer):
 *   - 2 daily exports per day (resets daily)
 *   - 10 one-time welcome export credits (don't reset)
 *   - 3 turbo export trials
 * 
 * Pro tiers (Gym Leader, Champion, Founding Trainer):
 *   - Unlimited exports
 *   - Turbo speed always on
 *   - Cloud sync (Annual+ only)
 * 
 * Uses two tables:
 *   - user_exports: Date-based daily export counts (cleaned by Vercel cron)
 *   - user_export_limits: User-level limits (welcome credits, turbo trials)
 */

import { getClient } from "./db"

// Constants
export const FREE_TIER_DAILY_LIMIT = 2           // Export attempts per day
export const FREE_TIER_DECK_MAX_CARDS = 100      // Max cards per deck (prevents 1000-card workaround)
export const WELCOME_EXPORT_CREDITS = 5
export const TURBO_EXPORT_LIMIT = 3

// Data retention for daily exports
// Set to 0 to never delete (keeps all history for analytics)
// Default 365 days = 1 year of analytics data
// 
// Storage estimate (ALL users recorded - free + Pro):
// - 10k users × 1 export/day × 365 days = 3.65M rows/year
// - ~50 bytes/row = ~182MB/year for 10k active users
// - Pro users export more frequently, so factor 2-5x for heavy users
export const EXPORT_RETENTION_DAYS = 730

interface DailyExportRecord {
  user_id: string
  date: string // YYYY-MM-DD
  count: number
  created_at: string
}

interface UserExportLimits {
  user_id: string
  welcome_credits_used: number      // How many of 5 welcome credits used
  turbo_exports_used: number        // How many of turbo trial exports used
  created_at: string
  updated_at: string
}

/**
 * Get today's export count from user_exports table
 */
async function getTodayExportCount(userId: string): Promise<number> {
  const db = getClient()
  const today = new Date().toISOString().split('T')[0]
  
  const result = await db.execute({
    sql: `SELECT count FROM user_exports WHERE user_id = ? AND date = ?`,
    args: [userId, today]
  })
  
  return result.rows.length > 0 ? Number(result.rows[0].count) : 0
}



/**
 * Get or create user export limits record (welcome credits + turbo trials)
 */
async function getOrCreateUserLimits(userId: string): Promise<UserExportLimits> {
  const db = getClient()
  
  // Try to get existing record
  const result = await db.execute({
    sql: `SELECT * FROM user_export_limits WHERE user_id = ?`,
    args: [userId]
  })
  
  if (result.rows.length > 0) {
    const row = result.rows[0]
    return {
      user_id: userId,
      welcome_credits_used: Number(row.welcome_credits_used),
      turbo_exports_used: Number(row.turbo_exports_used),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at)
    }
  }
  
  // Create new record for first-time user
  await db.execute({
    sql: `
      INSERT INTO user_export_limits 
      (user_id, welcome_credits_used, turbo_exports_used)
      VALUES (?, 0, 0)
    `,
    args: [userId]
  })
  
  return {
    user_id: userId,
    welcome_credits_used: 0,
    turbo_exports_used: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
}

/**
 * Get remaining daily exports for today
 */
async function getRemainingDailyExports(userId: string): Promise<number> {
  const used = await getTodayExportCount(userId)
  return Math.max(0, FREE_TIER_DAILY_LIMIT - used)
}

/**
 * Check if user can export (hasn't hit any limits)
 * Priority: daily exports -> welcome credits -> turbo trials
 */
export async function canUserExport(userId: string, isPro: boolean = false): Promise<boolean> {
  if (isPro) return true
  
  const remainingDaily = await getRemainingDailyExports(userId)
  if (remainingDaily > 0) return true
  
  const limits = await getOrCreateUserLimits(userId)
  const remainingWelcome = WELCOME_EXPORT_CREDITS - limits.welcome_credits_used
  if (remainingWelcome > 0) return true
  
  const remainingTurbo = TURBO_EXPORT_LIMIT - limits.turbo_exports_used
  return remainingTurbo > 0
}

/**
 * Check if user can use turbo fast export
 */
export async function canUseTurboExport(userId: string, isPro: boolean = false): Promise<boolean> {
  if (isPro) return true
  
  const limits = await getOrCreateUserLimits(userId)
  return limits.turbo_exports_used < TURBO_EXPORT_LIMIT
}

/**
 * Increment today's export count in user_exports table
 * Records ALL exports - free and Pro - for analytics
 */
async function incrementDailyExport(userId: string): Promise<void> {
  const db = getClient()
  const today = new Date().toISOString().split('T')[0]
  
  await db.execute({
    sql: `
      INSERT INTO user_exports (user_id, date, count)
      VALUES (?, ?, 1)
      ON CONFLICT(user_id, date)
      DO UPDATE SET count = count + 1, created_at = CURRENT_TIMESTAMP
    `,
    args: [userId, today]
  })
}

/**
 * Record an export for the user
 * For free users: Consumes daily -> welcome -> turbo
 * For Pro users: Always records analytics, returns 'pro'
 * Returns the type of export consumed
 */
export async function recordExport(
  userId: string, 
  isPro: boolean = false
): Promise<'daily' | 'welcome' | 'turbo' | 'pro' | null> {
  // Always record the export for analytics (free and Pro)
  await incrementDailyExport(userId)
  
  if (isPro) {
    return 'pro'
  }
  
  const remainingDaily = await getRemainingDailyExports(userId)
  
  if (remainingDaily > 0) {
    // Use daily export
    return 'daily'
  }
  
  const limits = await getOrCreateUserLimits(userId)
  
  const remainingWelcome = WELCOME_EXPORT_CREDITS - limits.welcome_credits_used
  if (remainingWelcome > 0) {
    // Use welcome credit
    await getClient().execute({
      sql: `
        UPDATE user_export_limits 
        SET welcome_credits_used = welcome_credits_used + 1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `,
      args: [userId]
    })
    return 'welcome'
  }
  
  const remainingTurbo = TURBO_EXPORT_LIMIT - limits.turbo_exports_used
  if (remainingTurbo > 0) {
    // Use turbo trial
    await getClient().execute({
      sql: `
        UPDATE user_export_limits 
        SET turbo_exports_used = turbo_exports_used + 1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `,
      args: [userId]
    })
    return 'turbo'
  }
  
  return null
}

/**
 * Record a turbo export trial
 */
export async function recordTurboTrial(userId: string): Promise<boolean> {
  const limits = await getOrCreateUserLimits(userId)
  
  if (limits.turbo_exports_used >= TURBO_EXPORT_LIMIT) {
    return false
  }
  
  await getClient().execute({
    sql: `
      UPDATE user_export_limits 
      SET turbo_exports_used = turbo_exports_used + 1, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `,
    args: [userId]
  })
  
  return true
}

/**
 * Get remaining exports for user
 * Returns detailed breakdown of all export types
 */
export async function getRemainingExports(userId: string, isPro: boolean = false): Promise<{
  daily: number
  welcome: number
  turboRemaining: number
  total: number
}> {
  if (isPro) {
    return {
      daily: Infinity,
      welcome: Infinity,
      turboRemaining: Infinity,
      total: Infinity
    }
  }
  
  const [dailyUsed, limits] = await Promise.all([
    getTodayExportCount(userId),
    getOrCreateUserLimits(userId)
  ])
  
  const dailyRemaining = Math.max(0, FREE_TIER_DAILY_LIMIT - dailyUsed)
  const welcomeRemaining = Math.max(0, WELCOME_EXPORT_CREDITS - limits.welcome_credits_used)
  const turboRemaining = Math.max(0, TURBO_EXPORT_LIMIT - limits.turbo_exports_used)
  
  return {
    daily: dailyRemaining,
    welcome: welcomeRemaining,
    turboRemaining,
    total: dailyRemaining + welcomeRemaining + turboRemaining
  }
}

/**
 * Get full user export limits (for API responses)
 */
export async function getUserExportLimits(userId: string, isPro: boolean = false): Promise<{
  dailyUsed: number
  dailyLimit: number
  welcomeUsed: number
  welcomeLimit: number
  turboUsed: number
  turboLimit: number
  isPro: boolean
}> {
  if (isPro) {
    return {
      dailyUsed: 0,
      dailyLimit: Infinity as unknown as number,
      welcomeUsed: 0,
      welcomeLimit: Infinity as unknown as number,
      turboUsed: 0,
      turboLimit: TURBO_EXPORT_LIMIT,
      isPro: true
    }
  }
  
  const [dailyUsed, limits] = await Promise.all([
    getTodayExportCount(userId),
    getOrCreateUserLimits(userId)
  ])
  
  return {
    dailyUsed,
    dailyLimit: FREE_TIER_DAILY_LIMIT,
    welcomeUsed: limits.welcome_credits_used,
    welcomeLimit: WELCOME_EXPORT_CREDITS,
    turboUsed: limits.turbo_exports_used,
    turboLimit: TURBO_EXPORT_LIMIT,
    isPro: false
  }
}

/**
 * Create the user_export_limits table (run once during setup)
 * user_exports table should already exist
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
    args: []
  })
  
  // Index for faster lookups
  await db.execute({
    sql: `CREATE INDEX IF NOT EXISTS idx_export_limits_user ON user_export_limits(user_id)`,
    args: []
  })
}

/**
 * Create the exports table (for fresh installs)
 * This matches your existing schema
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
    args: []
  })
  
  // Index for faster lookups
  await db.execute({
    sql: `CREATE INDEX IF NOT EXISTS idx_exports_user_date ON user_exports(user_id, date)`,
    args: []
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
 * 
 * Set EXPORT_RETENTION_DAYS = 0 to never delete (keep all history for analytics)
 * Default: 365 days (1 year of analytics data)
 * 
 * Call this via Vercel Cron:
 * - Schedule: 0 0 * * * (daily at midnight)
 * - Endpoint: /api/cron/cleanup-exports
 */
export async function cleanupOldExports(retentionDays: number = EXPORT_RETENTION_DAYS): Promise<number> {
  // retentionDays = 0 means never delete
  if (retentionDays <= 0) {
    console.log('[cleanup] Retention disabled - keeping all export history')
    return 0
  }
  
  const db = getClient()
  
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
  const cutoffStr = cutoffDate.toISOString().split('T')[0]
  
  const result = await db.execute({
    sql: `DELETE FROM user_exports WHERE date < ?`,
    args: [cutoffStr]
  })
  
  const deletedCount = result.rowsAffected || 0
  console.log(`[cleanup] Deleted ${deletedCount} old export records (older than ${cutoffDate.toISOString().split('T')[0]})`)
  
  return deletedCount
}

/**
 * Lightweight cleanup - only deletes very old entries (> 1 year)
 * Safe to run occasionally
 */
export async function cleanupVeryOldExports(): Promise<void> {
  const db = getClient()
  
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  const cutoffStr = oneYearAgo.toISOString().split('T')[0]
  
  // Use LIMIT to prevent long-running queries
  await db.execute({
    sql: `DELETE FROM user_exports WHERE date < ?`,
    args: [cutoffStr]
  })
}
