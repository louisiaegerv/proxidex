/**
 * Add a user subscription to Turso (for local dev)
 * Run: npx tsx scripts/add-user-to-turso.ts
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
const USER_ID = process.argv[2] || 'user_3C1DF9Y4WVhA1xsfhZb0ilEOXXA'

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set')
  process.exit(1)
}

async function main() {
  console.log(`Connecting to Turso: ${TURSO_URL}`)
  console.log(`Adding user: ${USER_ID}`)
  
  const client = createClient({
    url: TURSO_URL!,
    authToken: TURSO_TOKEN!,
  })

  // Check schema first
  const schema = await client.execute({
    sql: "SELECT sql FROM sqlite_master WHERE type='table' AND name='subscriptions'",
    args: []
  })
  console.log('Subscriptions table schema:')
  console.log(schema.rows[0]?.sql)

  // Check if user already exists
  const existing = await client.execute({
    sql: 'SELECT * FROM subscriptions WHERE user_id = ?',
    args: [USER_ID]
  })

  if (existing.rows.length > 0) {
    console.log('User already has subscription:')
    console.log(existing.rows[0])
  } else {
    // Insert founding_alpha subscription (using available columns)
    await client.execute({
      sql: `
        INSERT INTO subscriptions (user_id, tier, status, founding_number, started_at)
        VALUES (?, 'founding_alpha', 'active', 1, datetime('now'))
      `,
      args: [USER_ID]
    })
    console.log(`✅ Added founding_alpha subscription for ${USER_ID}`)
  }

  // Verify
  const verify = await client.execute({
    sql: 'SELECT * FROM subscriptions WHERE user_id = ?',
    args: [USER_ID]
  })
  console.log('\nCurrent subscription:')
  console.log(verify.rows[0])

  await client.close()
}

main().catch(console.error)
