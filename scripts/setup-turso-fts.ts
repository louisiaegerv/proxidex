/**
 * Setup Turso Native FTS for card search
 * 
 * Turso's FTS is built on Tantivy (Rust search engine) and provides:
 * - ngram tokenizer for partial matching ("Char" finds "Charizard")
 * - BM25 relevance scoring
 * - Automatic index updates on INSERT/UPDATE/DELETE
 * 
 * Docs: https://docs.turso.tech/sql-reference/functions/fts
 * 
 * Run with:
 *   npx tsx scripts/setup-turso-fts.ts
 * 
 * Or with explicit env vars:
 *   TURSO_DATABASE_URL=<url> TURSO_AUTH_TOKEN=<token> npx tsx scripts/setup-turso-fts.ts
 */

import { config } from 'dotenv'
import { createClient } from '@libsql/client/web'
import * as path from 'path'

// Load .env.local file
const envLocalPath = path.resolve(process.cwd(), '.env.local')
const envDevPath = path.resolve(process.cwd(), '.env.development.local')

config({ path: envLocalPath })  // Load .env.local
config({ path: envDevPath })    // Load .env.development.local (overrides)

async function main() {
  const url = process.env.TURSO_DATABASE_URL
  const token = process.env.TURSO_AUTH_TOKEN

  if (!url || !token) {
    console.error('Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN required')
    console.error('')
    console.error('Checked env files:')
    console.error(`  - ${envLocalPath}`)
    console.error(`  - ${envDevPath}`)
    console.error('')
    console.error('Make sure your .env.local contains:')
    console.error('  TURSO_DATABASE_URL=libsql://your-db.turso.io')
    console.error('  TURSO_AUTH_TOKEN=your-token-here')
    console.error('')
    console.error('Or run with explicit env vars:')
    console.error('  TURSO_DATABASE_URL=<url> TURSO_AUTH_TOKEN=<token> npx tsx scripts/setup-turso-fts.ts')
    process.exit(1)
  }

  console.log(`Connecting to Turso: ${url.replace(/token=.+/, '...')}`)

  const client = createClient({
    url,
    authToken: token,
  })

  console.log('Setting up Turso FTS...')

  // Check if index already exists
  const existingIndex = await client.execute({
    sql: `SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_cards_fts'`,
    args: []
  })

  if (existingIndex.rows.length > 0) {
    console.log('  FTS index already exists. Skipping creation.')
    console.log('  To recreate, drop it first: DROP INDEX idx_cards_fts;')
    return
  }

  // Create FTS index on card name with ngram tokenizer
  // ngram generates 2-3 character n-grams, perfect for partial matching
  // e.g., "Charizard" generates: Ch, Cha, ha, har, ar, ari, ri, riz, iz, iza, za, zar, ard...
  // This allows searching "Char" to find "Charizard", "Dark Charizard", "Charizard EX", etc.
  console.log('  Creating idx_cards_fts with ngram tokenizer...')
  await client.execute({
    sql: `
      CREATE INDEX idx_cards_fts ON cards USING fts (name)
      WITH (tokenizer = 'ngram')
    `,
    args: []
  })

  console.log('  ✅ Index created')
  console.log('  ℹ️  Populating index with existing data (this may take a moment for 20k+ cards)...')

  // Wait for initial indexing
  await new Promise(r => setTimeout(r, 3000))

  // Test the index
  console.log('\nTesting FTS index...')
  const testQueries = ['Charizard', 'Pikachu', 'Dark']
  
  for (const query of testQueries) {
    try {
      const result = await client.execute({
        sql: `SELECT COUNT(*) as count FROM cards WHERE fts_match(name, ?)`,
        args: [query]
      })
      console.log(`  "${query}": ${result.rows[0].count} matches`)
    } catch (err) {
      console.log(`  "${query}": Error - ${err}`)
    }
  }

  console.log('\n✅ Turso FTS setup complete!')
  console.log('\nExample queries:')
  console.log(`  -- Find cards with BM25 scoring`)
  console.log(`  SELECT name, fts_score(name, 'Charizard') as score`)
  console.log(`  FROM cards WHERE fts_match(name, 'Charizard')`)
  console.log(`  ORDER BY score DESC LIMIT 10;`)
  console.log(``)
  console.log(`  -- Partial match with ngram ("Char" finds "Charizard")`)
  console.log(`  SELECT name FROM cards WHERE fts_match(name, 'Char');`)
  console.log(``)
  console.log(`  -- Highlight matches`)
  console.log(`  SELECT fts_highlight(name, '<b>', '</b>', 'Charizard')`)
  console.log(`  FROM cards WHERE fts_match(name, 'Charizard');`)
  console.log(``)
  console.log('Maintenance:')
  console.log('  OPTIMIZE INDEX idx_cards_fts; -- Run after bulk imports')
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
