/**
 * Test if SQLite FTS5 is available
 */

import { config } from 'dotenv'
import { createClient } from '@libsql/client/web'
import * as path from 'path'

config({ path: path.resolve(process.cwd(), '.env.local') })

async function testFTS5() {
  const url = process.env.TURSO_DATABASE_URL
  const token = process.env.TURSO_AUTH_TOKEN

  if (!url || !token) {
    console.error('Missing env vars')
    process.exit(1)
  }

  const client = createClient({ url, authToken: token })

  console.log('Testing SQLite FTS5 availability...\n')

  // Test 1: Check if FTS5 is available
  try {
    const result = await client.execute({
      sql: "SELECT fts5('test')",
      args: []
    })
    console.log('✅ FTS5 function available:', result.rows[0])
  } catch (e: any) {
    console.log('❌ FTS5 not available:', e.message || e)
  }

  // Test 2: Try to create a virtual table
  console.log('\nTrying to create FTS5 virtual table...')
  try {
    await client.execute({
      sql: `CREATE VIRTUAL TABLE IF NOT EXISTS cards_fts USING fts5(name, content='cards', content_rowid='rowid')`,
      args: []
    })
    console.log('✅ FTS5 virtual table created')
    
    // Try to query it
    const result = await client.execute({
      sql: `SELECT * FROM cards_fts WHERE cards_fts MATCH 'Charizard' LIMIT 5`,
      args: []
    })
    console.log('Query result:', result.rows.length, 'rows')
    
    // Clean up
    await client.execute({ sql: 'DROP TABLE IF EXISTS cards_fts', args: [] })
  } catch (e: any) {
    console.log('❌ FTS5 virtual table failed:', e.message || e)
  }

  // Test 3: Check available extensions
  console.log('\nChecking PRAGMAs...')
  try {
    const compileOptions = await client.execute({
      sql: 'SELECT * FROM pragma_compile_options() WHERE compile_options LIKE "%FTS%"',
      args: []
    })
    console.log('FTS compile options:', compileOptions.rows)
  } catch (e: any) {
    console.log('Compile options check failed:', e.message || e)
  }
}

testFTS5().catch(console.error)
