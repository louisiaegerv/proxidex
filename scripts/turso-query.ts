/**
 * Run an ad-hoc SQL query against Turso
 *
 * Usage:
 *   npx tsx scripts/turso-query.ts "SELECT * FROM decks WHERE user_id = 'user_xxx'"
 *   npx tsx scripts/turso-query.ts "SELECT name, sql FROM sqlite_master WHERE type='table'"
 */

import { createClient } from '@libsql/client/web'
import fs from 'fs'
import path from 'path'

// Load env vars from .env files
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

const query = process.argv.slice(2).join(' ')

if (!query) {
  console.error('Usage: npx tsx scripts/turso-query.ts "<SQL>"')
  console.error('')
  console.error('Examples:')
  console.error('  npx tsx scripts/turso-query.ts "SELECT * FROM decks"')
  console.error('  npx tsx scripts/turso-query.ts "SELECT * FROM subscriptions"')
  console.error('  npx tsx scripts/turso-query.ts "PRAGMA table_info(decks)"')
  process.exit(1)
}

async function main() {
  console.log(`Connecting to: ${TURSO_URL}`)
  console.log(`Query: ${query}`)
  console.log('')

  const client = createClient({
    url: TURSO_URL!,
    authToken: TURSO_TOKEN!,
  })

  try {
    const result = await client.execute({ sql: query, args: [] })

    if (result.rows.length === 0) {
      console.log('No rows returned.')
      if (result.rowsAffected !== undefined) {
        console.log(`Rows affected: ${result.rowsAffected}`)
      }
    } else {
      console.log(`Rows returned: ${result.rows.length}`)
      console.log('')
      console.log(JSON.stringify(result.rows, null, 2))
    }
  } catch (err: any) {
    console.error('Query failed:', err.message)
    process.exit(1)
  }

  await client.close()
}

main().catch(console.error)
