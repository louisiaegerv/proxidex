/**
 * Test different FTS syntax variations to find what works
 */

import { config } from 'dotenv'
import { createClient } from '@libsql/client/web'
import * as path from 'path'

config({ path: path.resolve(process.cwd(), '.env.local') })

async function testSyntax() {
  const url = process.env.TURSO_DATABASE_URL
  const token = process.env.TURSO_AUTH_TOKEN

  if (!url || !token) {
    console.error('Missing env vars')
    process.exit(1)
  }

  const client = createClient({ url, authToken: token })

  // First check SQLite version and Turso info
  console.log('Checking database info...')
  try {
    const version = await client.execute({ sql: 'SELECT sqlite_version()', args: [] })
    console.log('SQLite version:', version.rows[0])
  } catch (e) {
    console.log('Version check failed:', e)
  }

  // Drop existing index if any
  console.log('\nDropping any existing FTS index...')
  try {
    await client.execute({ sql: 'DROP INDEX IF EXISTS idx_cards_fts', args: [] })
    console.log('  Dropped (or did not exist)')
  } catch (e) {
    console.log('  Error dropping:', e)
  }

  // Test different syntax variations
  const syntaxes = [
    // Variation 1: Basic (no WITH)
    `CREATE INDEX idx_cards_fts ON cards USING fts (name)`,
    
    // Variation 2: Single line WITH
    `CREATE INDEX idx_cards_fts ON cards USING fts (name) WITH (tokenizer = 'ngram')`,
    
    // Variation 3: Double quotes for tokenizer
    `CREATE INDEX idx_cards_fts ON cards USING fts (name) WITH (tokenizer = "ngram")`,
    
    // Variation 4: No spaces around =
    `CREATE INDEX idx_cards_fts ON cards USING fts(name) WITH(tokenizer='ngram')`,
  ]

  for (let i = 0; i < syntaxes.length; i++) {
    const sql = syntaxes[i]
    console.log(`\n--- Test ${i + 1} ---`)
    console.log('SQL:', sql)
    
    try {
      await client.execute({ sql, args: [] })
      console.log('✅ SUCCESS!')
      
      // Test it works
      const testResult = await client.execute({
        sql: `SELECT COUNT(*) as count FROM cards WHERE fts_match(name, 'Charizard')`,
        args: []
      })
      console.log('Test query result:', testResult.rows[0].count, 'matches')
      
      // Clean up for next test
      await client.execute({ sql: 'DROP INDEX idx_cards_fts', args: [] })
    } catch (e: any) {
      console.log('❌ FAILED:', e.message || e)
    }
  }
}

testSyntax().catch(console.error)
