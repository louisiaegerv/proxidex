/**
 * Diagnose FTS5 case sensitivity and indexing issues
 */

import { config } from 'dotenv'
import { createClient } from '@libsql/client/web'
import * as path from 'path'

config({ path: path.resolve(process.cwd(), '.env.local') })

async function diagnose() {
  const url = process.env.TURSO_DATABASE_URL
  const token = process.env.TURSO_AUTH_TOKEN

  if (!url || !token) {
    console.error('Missing env vars')
    process.exit(1)
  }

  const client = createClient({ url, authToken: token })

  console.log('=== FTS5 Diagnostics ===\n')

  // 1. Check if FTS table exists
  console.log('1. Checking cards_fts table...')
  const tableInfo = await client.execute({
    sql: "SELECT name FROM sqlite_master WHERE type='table' AND name='cards_fts'",
    args: []
  })
  console.log('   Exists:', tableInfo.rows.length > 0)

  // 2. Check row count
  console.log('\n2. Row counts...')
  const cardCount = await client.execute({ sql: 'SELECT COUNT(*) as count FROM cards', args: [] })
  const ftsCount = await client.execute({ sql: 'SELECT COUNT(*) as count FROM cards_fts', args: [] })
  console.log('   cards table:', cardCount.rows[0].count)
  console.log('   cards_fts table:', ftsCount.rows[0].count)

  // 3. Test exact case queries
  console.log('\n3. Testing exact case queries...')
  const queries = [
    'Charizard',
    'charizard', 
    'CHARIZARD',
    'Char*',
    'char*'
  ]

  for (const q of queries) {
    try {
      const result = await client.execute({
        sql: 'SELECT COUNT(*) as count FROM cards_fts WHERE cards_fts MATCH ?',
        args: [q]
      })
      console.log(`   "${q}": ${result.rows[0].count} matches`)
    } catch (e: any) {
      console.log(`   "${q}": ERROR - ${e.message}`)
    }
  }

  // 4. Sample actual results
  console.log('\n4. Sample results for "charizard":')
  try {
    const results = await client.execute({
      sql: `SELECT c.name FROM cards c 
            JOIN cards_fts f ON c.rowid = f.rowid 
            WHERE f.cards_fts MATCH 'charizard' 
            LIMIT 5`,
      args: []
    })
    results.rows.forEach((row: any, i: number) => {
      console.log(`   ${i + 1}. ${row.name}`)
    })
  } catch (e: any) {
    console.log('   ERROR:', e.message)
  }

  // 5. Check FTS5 tokenizer
  console.log('\n5. Testing tokenizer behavior...')
  try {
    // Create a test FTS table to check tokenizer
    await client.execute({ sql: 'DROP TABLE IF EXISTS fts_test', args: [] })
    await client.execute({ 
      sql: 'CREATE VIRTUAL TABLE fts_test USING fts5(text)',
      args: [] 
    })
    await client.execute({
      sql: "INSERT INTO fts_test(text) VALUES ('Charizard'), ('charizard'), ('CHARIZARD')",
      args: []
    })
    
    const testResult = await client.execute({
      sql: "SELECT * FROM fts_test WHERE fts_test MATCH 'charizard'",
      args: []
    })
    console.log('   Test table matches for "charizard":', testResult.rows.length)
    testResult.rows.forEach((row: any) => console.log('     -', row.text))
    
    await client.execute({ sql: 'DROP TABLE fts_test', args: [] })
  } catch (e: any) {
    console.log('   ERROR:', e.message)
  }

  // 6. Check actual card data case
  console.log('\n6. Sample card names from database:')
  const sampleCards = await client.execute({
    sql: "SELECT name FROM cards WHERE name LIKE '%Charizard%' LIMIT 5",
    args: []
  })
  sampleCards.rows.forEach((row: any, i: number) => {
    console.log(`   ${i + 1}. "${row.name}"`)
  })

  console.log('\n=== End Diagnostics ===')
}

diagnose().catch(console.error)
