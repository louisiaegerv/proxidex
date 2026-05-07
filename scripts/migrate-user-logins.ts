/**
 * Migrate user_logins table to add streak + timestamp columns
 * Run: npx tsx scripts/migrate-user-logins.ts
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

  console.log("Migrating user_logins table...\n")

  // Check current schema
  const schema = await client.execute({
    sql: "PRAGMA table_info(user_logins)",
    args: [],
  })
  const columns = schema.rows.map((r) => String(r.name))
  console.log("Current columns:", columns.join(", "))

  const needed = [
    { name: "current_streak", type: "INTEGER DEFAULT 0" },
    { name: "longest_streak", type: "INTEGER DEFAULT 0" },
    { name: "first_login_at", type: "DATETIME" },
    { name: "last_login_at", type: "DATETIME" },
  ]

  for (const col of needed) {
    if (!columns.includes(col.name)) {
      console.log(`  Adding column: ${col.name}`)
      await client.execute({
        sql: `ALTER TABLE user_logins ADD COLUMN ${col.name} ${col.type}`,
        args: [],
      })
    } else {
      console.log(`  Column already exists: ${col.name}`)
    }
  }

  // Verify
  const newSchema = await client.execute({
    sql: "PRAGMA table_info(user_logins)",
    args: [],
  })
  console.log("\nUpdated columns:")
  for (const row of newSchema.rows) {
    console.log(`  ${row.name} (${row.type})`)
  }

  await client.close()
  console.log("\n✅ Migration complete")
}

main().catch(console.error)
