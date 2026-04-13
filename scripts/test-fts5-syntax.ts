/**
 * Test exact FTS5 JOIN syntax
 */

import { config } from 'dotenv'
import { createClient } from '@libsql/client/web'
import * as path from 'path'

config({ path: path.resolve(process.cwd(), '.env.local') })

async function test() {
  const url = process.env.TURSO_DATABASE_URL
  const token = process.env.TURSO_AUTH_TOKEN

  if (!url || !token) {
    console.error('Missing env vars')
    process.exit(1)
  }

  const client = createClient({ url, authToken: token })

  console.log('Testing FTS5 JOIN syntax variations...\n')

  const tests = [
    {
      name: 'f.cards_fts MATCH (my current code)',
      sql: `SELECT c.* FROM cards c JOIN cards_fts f ON c.rowid = f.rowid WHERE f.cards_fts MATCH 'charizard' LIMIT 3`
    },
    {
      name: 'f MATCH (without column prefix)',
      sql: `SELECT c.* FROM cards c JOIN cards_fts f ON c.rowid = f.rowid WHERE f MATCH 'charizard' LIMIT 3`
    },
    {
      name: 'cards_fts MATCH (direct table)',
      sql: `SELECT c.* FROM cards c JOIN cards_fts ON c.rowid = cards_fts.rowid WHERE cards_fts MATCH 'charizard' LIMIT 3`
    },
    {
      name: 'Direct FROM cards_fts MATCH',
      sql: `SELECT rowid FROM cards_fts WHERE cards_fts MATCH 'charizard' LIMIT 3`
    },
    {
      name: 'Direct FROM cards_fts (alias)',
      sql: `SELECT rowid FROM cards_fts f WHERE f MATCH 'charizard' LIMIT 3`
    },
    {
      name: 'f MATCH with prefix *',
      sql: `SELECT c.* FROM cards c JOIN cards_fts f ON c.rowid = f.rowid WHERE f MATCH 'char*' LIMIT 3`
    }
  ]

  for (const test of tests) {
    try {
      const result = await client.execute({ sql: test.sql, args: [] })
      console.log(`✅ ${test.name}`)
      console.log(`   SQL: ${test.sql.slice(0, 80)}...`)
      console.log(`   Results: ${result.rows.length} rows`)
      if (result.rows.length > 0) {
        console.log(`   Sample:`, result.rows[0])
      }
    } catch (e: any) {
      console.log(`❌ ${test.name}`)
      console.log(`   SQL: ${test.sql.slice(0, 80)}...`)
      console.log(`   Error: ${e.message}`)
    }
    console.log('')
  }
}

test().catch(console.error)
