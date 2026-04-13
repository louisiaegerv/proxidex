/**
 * Debug endpoint to check FTS5 status
 */

import { createClient } from '@libsql/client/web'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    })

    // Check if FTS table exists
    const tableResult = await client.execute({
      sql: "SELECT name FROM sqlite_master WHERE type='table' AND name='cards_fts'",
      args: []
    })
    const hasFtsTable = tableResult.rows.length > 0

    // Check row count in FTS table
    let ftsCount = 0
    if (hasFtsTable) {
      const countResult = await client.execute({
        sql: 'SELECT COUNT(*) as count FROM cards_fts',
        args: []
      })
      ftsCount = (countResult.rows[0] as any)?.count || 0
    }

    // Check total cards
    const totalResult = await client.execute({
      sql: 'SELECT COUNT(*) as count FROM cards',
      args: []
    })
    const totalCards = (totalResult.rows[0] as any)?.count || 0

    // Check global cache
    const globalCache = (globalThis as any).__ftsAvailable

    // Test FTS query
    let testResult: any = null
    let testError: string | null = null
    if (hasFtsTable) {
      try {
        const result = await client.execute({
          sql: "SELECT rowid FROM cards_fts WHERE cards_fts MATCH 'charizard*' LIMIT 5",
          args: []
        })
        testResult = { count: result.rows.length }
      } catch (e: any) {
        testError = e.message
      }
    }

    return Response.json({
      hasFtsTable,
      ftsRowCount: ftsCount,
      totalCards,
      globalCache,
      testQuery: testResult,
      testError,
      env: {
        hasUrl: !!process.env.TURSO_DATABASE_URL,
        hasToken: !!process.env.TURSO_AUTH_TOKEN,
      }
    })
  } catch (error: any) {
    return Response.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 })
  }
}
