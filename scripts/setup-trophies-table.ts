/**
 * Setup user_trophies table for Trophy Case feature
 *
 * Usage:
 *   npx tsx scripts/setup-trophies-table.ts
 */

import { createClient } from "@libsql/client/web"
import fs from "fs"
import path from "path"

// Load env vars from .env files
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
  console.error("Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set")
  console.error("")
  console.error("Make sure your .env.local or .env.development.local contains:")
  console.error("  TURSO_DATABASE_URL=libsql://your-db.turso.io")
  console.error("  TURSO_AUTH_TOKEN=your-token")
  process.exit(1)
}

async function main() {
  console.log(`Connecting to Turso: ${TURSO_URL}`)

  const client = createClient({
    url: TURSO_URL!,
    authToken: TURSO_TOKEN!,
  })

  console.log("\nSetting up user_trophies table...\n")

  // Create user_trophies table
  console.log("  Creating user_trophies table...")
  await client.execute({
    sql: `
      CREATE TABLE IF NOT EXISTS user_trophies (
        user_id TEXT NOT NULL,
        trophy_id TEXT NOT NULL,
        unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        progress INTEGER DEFAULT 0,
        progress_target INTEGER DEFAULT 1,
        PRIMARY KEY (user_id, trophy_id)
      )
    `,
    args: [],
  })

  // Create indexes
  console.log("  Creating indexes...")
  await client.execute({
    sql: `CREATE INDEX IF NOT EXISTS idx_user_trophies_user_id ON user_trophies(user_id)`,
    args: [],
  })
  await client.execute({
    sql: `CREATE INDEX IF NOT EXISTS idx_user_trophies_trophy_id ON user_trophies(trophy_id)`,
    args: [],
  })

  // Verify setup
  console.log("\n  Verifying setup...")
  const tableCheck = await client.execute({
    sql: "SELECT name FROM sqlite_master WHERE type='table' AND name='user_trophies'",
    args: [],
  })
  console.log(`    Table exists: ${tableCheck.rows.length > 0}`)

  const indexCheck = await client.execute({
    sql: "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_user_trophies_%'",
    args: [],
  })
  console.log(`    Indexes created: ${indexCheck.rows.length}`)

  console.log("\n✅ user_trophies table setup complete!")
  console.log("\nTrophy IDs reference:")
  console.log(
    "  Tier trophies: founding_alpha, founding_beta, founding_gamma, champion, gym_leader"
  )
  console.log(
    "  Achievement trophies: first_deck, first_export, limitless_import, deck_collector,"
  )
  console.log(
    "                        export_veteran, search_pro, meta_chaser, print_master, master_collector"
  )

  await client.close()
}

main().catch((err) => {
  console.error("Error:", err)
  process.exit(1)
})
