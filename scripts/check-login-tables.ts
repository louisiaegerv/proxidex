/**
 * Verify user_logins and user_login_events table schemas
 * Run: npx tsx scripts/check-login-tables.ts
 */

import { createClient } from "@libsql/client/web"
import fs from "fs"
import path from "path"

const envLocalPath = path.join(process.cwd(), ".env.local")
const envDevPath = path.join(process.cwd(), ".env.development.local")

function loadEnvFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf-8")
    const lines = content.split("\n")
    for (const line of lines) {
      const match = line.match(/^([^=]+)=(.*)$/)
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "")
      }
    }
  }
}

loadEnvFile(envLocalPath)
loadEnvFile(envDevPath)

const TURSO_URL = process.env.TURSO_DATABASE_URL
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN")
  process.exit(1)
}

async function main() {
  const client = createClient({
    url: TURSO_URL!,
    authToken: TURSO_TOKEN!,
  })

  console.log("=== Checking Table Schemas ===\n")

  // Check user_logins schema
  console.log("--- user_logins ---")
  const loginsSchema = await client.execute({
    sql: "PRAGMA table_info(user_logins)",
    args: [],
  })
  if (loginsSchema.rows.length === 0) {
    console.log("  TABLE DOES NOT EXIST")
  } else {
    for (const row of loginsSchema.rows) {
      console.log(`  ${row.cid}: ${row.name} (${row.type}) ${row.notnull ? 'NOT NULL' : ''} ${row.pk ? 'PK' : ''}`)
    }
  }

  // Check user_login_events schema
  console.log("\n--- user_login_events ---")
  const eventsSchema = await client.execute({
    sql: "PRAGMA table_info(user_login_events)",
    args: [],
  })
  if (eventsSchema.rows.length === 0) {
    console.log("  TABLE DOES NOT EXIST")
  } else {
    for (const row of eventsSchema.rows) {
      console.log(`  ${row.cid}: ${row.name} (${row.type}) ${row.notnull ? 'NOT NULL' : ''} ${row.pk ? 'PK' : ''}`)
    }
  }

  // Check indexes
  console.log("\n--- Indexes ---")
  const indexes = await client.execute({
    sql: "SELECT name, sql FROM sqlite_master WHERE type='index' AND (name LIKE '%login%' OR name LIKE '%trophies%')",
    args: [],
  })
  for (const row of indexes.rows) {
    console.log(`  ${row.name}: ${row.sql ? 'OK' : 'auto-index'}`)
  }

  // Check row counts
  console.log("\n--- Row Counts ---")
  const loginsCount = await client.execute({
    sql: "SELECT COUNT(*) as count FROM user_logins",
    args: [],
  })
  console.log(`  user_logins: ${loginsCount.rows[0].count} rows`)

  const eventsCount = await client.execute({
    sql: "SELECT COUNT(*) as count FROM user_login_events",
    args: [],
  })
  console.log(`  user_login_events: ${eventsCount.rows[0].count} rows`)

  // Show sample data
  if (Number(loginsCount.rows[0].count) > 0) {
    console.log("\n--- Sample user_logins data ---")
    const sample = await client.execute({
      sql: "SELECT * FROM user_logins LIMIT 3",
      args: [],
    })
    console.log(JSON.stringify(sample.rows, null, 2))
  }

  if (Number(eventsCount.rows[0].count) > 0) {
    console.log("\n--- Sample user_login_events data ---")
    const sample = await client.execute({
      sql: "SELECT * FROM user_login_events LIMIT 3",
      args: [],
    })
    console.log(JSON.stringify(sample.rows, null, 2))
  }

  await client.close()
}

main().catch(console.error)
