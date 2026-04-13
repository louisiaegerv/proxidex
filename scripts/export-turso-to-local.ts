/**
 * Export Turso database to local SQLite file
 * Run: npx tsx scripts/export-turso-to-local.ts
 */

import { createClient } from '@libsql/client/web'
import fs from 'fs'
import path from 'path'

// Load env vars from .env.local
const envLocalPath = path.join(process.cwd(), '.env.local')
const envDevPath = path.join(process.cwd(), '.env.development.local')

function loadEnvFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    for (const line of lines) {
      const match = line.match(/^([^=]+)=(.*)$/)
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
      }
    }
  }
}

// Load from both files (development.local takes precedence)
loadEnvFile(envLocalPath)
loadEnvFile(envDevPath)

const TURSO_URL = process.env.TURSO_DATABASE_URL
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set')
  console.error('')
  console.error('Make sure your .env.local or .env.development.local contains:')
  console.error('  TURSO_DATABASE_URL=libsql://your-db.turso.io')
  console.error('  TURSO_AUTH_TOKEN=your-token')
  process.exit(1)
}

async function exportDatabase() {
  console.log('Connecting to Turso...')
  console.log(`URL: ${TURSO_URL}`)
  
  const client = createClient({
    url: TURSO_URL!,
    authToken: TURSO_TOKEN!,
  })

  // Get all tables
  const tablesResult = await client.execute({
    sql: "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    args: []
  })
  
  const tables = tablesResult.rows.map(r => String(r.name))
  console.log(`Found tables: ${tables.join(', ')}`)

  const outputPath = path.join(process.cwd(), 'cards.db')
  const sqlPath = outputPath + '.sql'
  
  // Remove existing SQL dump file
  if (fs.existsSync(sqlPath)) {
    fs.unlinkSync(sqlPath)
    console.log('Removed existing cards.db.sql')
  }
  
  // Check if cards.db is locked (dev server running)
  const dbLocked = fs.existsSync(outputPath)
  if (dbLocked) {
    console.log('\n⚠️  Note: cards.db exists and may be locked by dev server')
    console.log('   The SQL dump will be created, but you\'ll need to:')
    console.log('   1. Stop your dev server')
    console.log('   2. Run: sqlite3 cards.db < cards.db.sql')
    console.log('   3. Restart your dev server\n')
  }

  console.log('Exporting data...')

  // Build SQL dump
  const lines: string[] = []
  lines.push('PRAGMA foreign_keys=OFF;')
  lines.push('BEGIN TRANSACTION;')
  
  for (const tableName of tables) {
    console.log(`  Exporting: ${tableName}`)
    
    // Get CREATE TABLE statement
    const schemaResult = await client.execute({
      sql: `SELECT sql FROM sqlite_master WHERE type='table' AND name=?`,
      args: [tableName]
    })
    
    if (schemaResult.rows.length > 0) {
      lines.push(String(schemaResult.rows[0].sql) + ';')
    }
    
    // Get all rows
    const rowsResult = await client.execute({
      sql: `SELECT * FROM "${tableName}"`,
      args: []
    })
    
    for (const row of rowsResult.rows) {
      const columns = Object.keys(row)
      const values = Object.values(row).map(v => {
        if (v === null) return 'NULL'
        if (typeof v === 'number') return String(v)
        return `'${String(v).replace(/'/g, "''")}'`
      })
      
      lines.push(`INSERT INTO "${tableName}" (${columns.join(',')}) VALUES (${values.join(',')});`)
    }
  }
  
  lines.push('COMMIT;')
  
  // Write SQL dump
  fs.writeFileSync(sqlPath, lines.join('\n'))
  console.log(`\nSQL dump saved to: ${sqlPath}`)
  
  console.log('\nTo create the SQLite database, run:')
  console.log(`  sqlite3 cards.db < cards.db.sql`)
  console.log('\nOr if you have the sqlite3 CLI installed:')
  console.log(`  cat cards.db.sql | sqlite3 cards.db`)
  
  await client.close()
  console.log('\nDone!')
}

exportDatabase().catch(err => {
  console.error('Export failed:', err)
  process.exit(1)
})
