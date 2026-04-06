/**
 * Initialize Database Script
 * 
 * Creates the SQLite database and tables for card storage.
 * Run this once before indexing cards.
 * 
 * Usage: npx tsx scripts/init-db.ts
 */

import { config } from 'dotenv'
config({ path: '.env.local' })
import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'cards.db')

console.log('Initializing database at:', DB_PATH)

async function initDb() {
  const SQL = await initSqlJs()
  
  const db = new SQL.Database()
  
  // Create cards table
  db.run(`
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      set_code TEXT NOT NULL,
      set_name TEXT NOT NULL,
      local_id TEXT NOT NULL,
      folder_name TEXT NOT NULL,
      variants TEXT DEFAULT 'normal',
      sizes TEXT DEFAULT 'sm,md,lg,xl'
    );
  `)
  
  // Create indexes for fast lookups
  db.run(`CREATE INDEX IF NOT EXISTS idx_name ON cards(name);`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_set_name ON cards(set_name);`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_set_code ON cards(set_code);`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_set_local ON cards(set_code, local_id);`)
  
  // Optional: Create decks table for persistence
  db.run(`
    CREATE TABLE IF NOT EXISTS decks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cards_json TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `)
  
  // Save to disk
  const data = db.export()
  fs.writeFileSync(DB_PATH, Buffer.from(data))
  
  console.log('✅ Database initialized successfully')
  console.log('Tables created:')
  console.log('  - cards (with indexes)')
  console.log('  - decks (optional)')
  console.log('')
  console.log('Next step: Run npx tsx scripts/index-cards.ts')
  
  db.close()
}

initDb().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
