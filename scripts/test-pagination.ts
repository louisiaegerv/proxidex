/**
 * Test FTS5 pagination row reads
 */

import { config } from 'dotenv'
import { createClient } from '@libsql/client/web'
import * as path from 'path'

config({ path: path.resolve(process.cwd(), '.env.local') })

async function testPagination() {
  const url = process.env.TURSO_DATABASE_URL
  const token = process.env.TURSO_AUTH_TOKEN

  if (!url || !token) {
    console.error('Missing env vars')
    process.exit(1)
  }

  const client = createClient({ url, authToken: token })
  const term = 'charizard*'

  console.log('Testing FTS5 pagination with OFFSET...\n')

  const tests = [
    { offset: 0, limit: 30, desc: 'First page (offset=0)' },
    { offset: 30, limit: 30, desc: 'Second page (offset=30)' },
    { offset: 60, limit: 30, desc: 'Third page (offset=60)' },
  ]

  for (const { offset, limit, desc } of tests) {
    console.log(`--- ${desc} ---`)
    
    // Test the data query
    const dataSql = `
      SELECT c.id, c.name FROM cards c
      JOIN cards_fts f ON c.rowid = f.rowid
      WHERE f.cards_fts MATCH '${term}'
      ORDER BY f.rank
      LIMIT ${limit} OFFSET ${offset}
    `
    console.log('Data SQL:', dataSql.replace(/\s+/g, ' ').trim())
    
    try {
      const start = Date.now()
      const dataResult = await client.execute({ sql: dataSql, args: [] })
      const duration = Date.now() - start
      console.log(`Results: ${dataResult.rows.length} rows in ${duration}ms`)
      if (dataResult.rows.length > 0) {
        console.log('First result:', dataResult.rows[0])
      }
    } catch (e: any) {
      console.log('ERROR:', e.message)
    }
    
    // Test the count query (should only run once, but let's check)
    const countSql = `SELECT COUNT(*) as count FROM cards_fts WHERE cards_fts MATCH '${term}'`
    console.log('Count SQL:', countSql)
    
    try {
      const start = Date.now()
      const countResult = await client.execute({ sql: countSql, args: [] })
      const duration = Date.now() - start
      console.log(`Count: ${countResult.rows[0].count} in ${duration}ms`)
    } catch (e: any) {
      console.log('ERROR:', e.message)
    }
    
    console.log('')
  }

  // Test without OFFSET (baseline)
  console.log('--- Baseline: No OFFSET, LIMIT 30 ---')
  const baselineSql = `
    SELECT c.id, c.name FROM cards c
    JOIN cards_fts f ON c.rowid = f.rowid
    WHERE f.cards_fts MATCH '${term}'
    ORDER BY f.rank
    LIMIT 30
  `
  console.log('SQL:', baselineSql.replace(/\s+/g, ' ').trim())
  
  try {
    const start = Date.now()
    const result = await client.execute({ sql: baselineSql, args: [] })
    const duration = Date.now() - start
    console.log(`Results: ${result.rows.length} rows in ${duration}ms`)
  } catch (e: any) {
    console.log('ERROR:', e.message)
  }
}

testPagination().catch(console.error)
