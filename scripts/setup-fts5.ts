/**
 * Setup SQLite FTS5 for card search
 * 
 * Uses standard SQLite FTS5 virtual table for full-text search:
 * - Better than LIKE queries (uses proper inverted index)
 * - Supports prefix matching: "Char*" finds "Charizard", "Charmander"
 * - BM25 ranking for relevance
 * 
 * Run with:
 *   npx tsx scripts/setup-fts5.ts
 */

import { config } from 'dotenv'
import { createClient } from '@libsql/client/web'
import * as path from 'path'

config({ path: path.resolve(process.cwd(), '.env.local') })

async function main() {
  const url = process.env.TURSO_DATABASE_URL
  const token = process.env.TURSO_AUTH_TOKEN

  if (!url || !token) {
    console.error('Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN required')
    console.error('Run: npx tsx scripts/setup-fts5.ts')
    process.exit(1)
  }

  console.log(`Connecting to Turso...`)

  const client = createClient({ url, authToken: token })

  console.log('Setting up SQLite FTS5...')

  // Check if FTS5 is available
  try {
    await client.execute({ sql: "SELECT fts5('test')", args: [] })
    console.log('  ✅ FTS5 is available')
  } catch (e) {
    console.error('  ❌ FTS5 not available on this database')
    process.exit(1)
  }

  // Drop existing FTS table if any
  console.log('  Dropping existing FTS table if present...')
  await client.execute({ sql: 'DROP TABLE IF EXISTS cards_fts', args: [] })

  // Create FTS5 virtual table
  // Contentless table: stores only FTS index, data lives in main cards table
  console.log('  Creating FTS5 virtual table...')
  await client.execute({
    sql: `
      CREATE VIRTUAL TABLE cards_fts USING fts5(
        name,
        content='cards',
        content_rowid='rowid'
      )
    `,
    args: []
  })

  // Populate the FTS index
  console.log('  Populating FTS index with existing cards...')
  await client.execute({
    sql: 'INSERT INTO cards_fts(rowid, name) SELECT rowid, name FROM cards',
    args: []
  })

  // Create triggers to keep FTS index in sync
  console.log('  Creating sync triggers...')
  
  // After insert: add to FTS
  await client.execute({
    sql: `
      CREATE TRIGGER IF NOT EXISTS cards_fts_insert
      AFTER INSERT ON cards
      BEGIN
        INSERT INTO cards_fts(rowid, name) VALUES (NEW.rowid, NEW.name);
      END
    `,
    args: []
  })

  // After delete: remove from FTS
  await client.execute({
    sql: `
      CREATE TRIGGER IF NOT EXISTS cards_fts_delete
      AFTER DELETE ON cards
      BEGIN
        INSERT INTO cards_fts(cards_fts, rowid, name) 
        VALUES ('delete', OLD.rowid, OLD.name);
      END
    `,
    args: []
  })

  // After update: update FTS
  await client.execute({
    sql: `
      CREATE TRIGGER IF NOT EXISTS cards_fts_update
      AFTER UPDATE ON cards
      BEGIN
        INSERT INTO cards_fts(cards_fts, rowid, name) 
        VALUES ('delete', OLD.rowid, OLD.name);
        INSERT INTO cards_fts(rowid, name) 
        VALUES (NEW.rowid, NEW.name);
      END
    `,
    args: []
  })

  // Test the index
  console.log('\n  Testing FTS5 index...')
  const testQueries = [
    { q: 'Charizard', desc: 'Exact match' },
    { q: 'Char*', desc: 'Prefix match (Charizard, Charmander...)' },
    { q: 'Pikachu', desc: 'Another exact' },
  ]

  for (const { q, desc } of testQueries) {
    try {
      const result = await client.execute({
        sql: `SELECT COUNT(*) as count FROM cards_fts WHERE cards_fts MATCH ?`,
        args: [q]
      })
      console.log(`    "${q}" (${desc}): ${result.rows[0].count} matches`)
    } catch (e: any) {
      console.log(`    "${q}": Error - ${e.message}`)
    }
  }

  console.log('\n✅ SQLite FTS5 setup complete!')
  console.log('\nExample queries:')
  console.log(`  -- Search with prefix matching`)
  console.log(`  SELECT c.* FROM cards c`)
  console.log(`  JOIN cards_fts f ON c.rowid = f.rowid`)
  console.log(`  WHERE cards_fts MATCH 'Char*'`)
  console.log(`  ORDER BY rank LIMIT 30;`)
  console.log(``)
  console.log(`  -- BM25 ranking`)
  console.log(`  SELECT c.name, rank FROM cards c`)
  console.log(`  JOIN cards_fts f ON c.rowid = f.rowid`)
  console.log(`  WHERE cards_fts MATCH 'Charizard'`)
  console.log(`  ORDER BY rank;`)
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
