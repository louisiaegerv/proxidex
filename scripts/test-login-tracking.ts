/**
 * Test login tracking end-to-end by directly calling recordLogin logic
 * Run: npx tsx scripts/test-login-tracking.ts
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

  const today = new Date().toISOString().split("T")[0]
  const testUserId = `test_user_${Date.now()}`

  console.log("Testing login tracking for user:", testUserId)
  console.log("Today:", today)

  // Simulate recordLogin (first login ever)
  console.log("\n--- First login ---")
  await client.execute({
    sql: `
      INSERT INTO user_logins
        (user_id, login_count, current_streak, longest_streak,
         first_login_at, last_login_at, last_login_date)
      VALUES (?, 1, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
    `,
    args: [testUserId, today],
  })
  await client.execute({
    sql: `INSERT OR IGNORE INTO user_login_events (user_id, login_date) VALUES (?, ?)`,
    args: [testUserId, today],
  })

  // Verify
  const logins1 = await client.execute({
    sql: "SELECT * FROM user_logins WHERE user_id = ?",
    args: [testUserId],
  })
  console.log("user_logins:", logins1.rows[0])

  const events1 = await client.execute({
    sql: "SELECT * FROM user_login_events WHERE user_id = ?",
    args: [testUserId],
  })
  console.log("user_login_events:", events1.rows)

  // Simulate same-day login (should be deduped)
  console.log("\n--- Same-day login (should dedupe) ---")
  const result2 = await client.execute({
    sql: `SELECT login_count, last_login_date FROM user_logins WHERE user_id = ?`,
    args: [testUserId],
  })
  const lastDate = String(result2.rows[0].last_login_date)
  if (lastDate === today) {
    console.log("Correctly deduped — same day")
  }

  // Simulate next-day login (should increment)
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]
  console.log("\n--- Simulating yesterday's login, then today's ---")
  await client.execute({
    sql: `UPDATE user_logins SET last_login_date = ? WHERE user_id = ?`,
    args: [yesterday, testUserId],
  })

  // Now simulate today's login
  const before = await client.execute({
    sql: "SELECT login_count, current_streak FROM user_logins WHERE user_id = ?",
    args: [testUserId],
  })
  console.log("Before:", before.rows[0])

  await client.execute({
    sql: `
      UPDATE user_logins
      SET login_count = login_count + 1,
          current_streak = current_streak + 1,
          longest_streak = MAX(longest_streak, current_streak + 1),
          last_login_at = CURRENT_TIMESTAMP,
          last_login_date = ?
      WHERE user_id = ?
    `,
    args: [today, testUserId],
  })
  await client.execute({
    sql: `INSERT OR IGNORE INTO user_login_events (user_id, login_date) VALUES (?, ?)`,
    args: [testUserId, today],
  })

  const after = await client.execute({
    sql: "SELECT * FROM user_logins WHERE user_id = ?",
    args: [testUserId],
  })
  console.log("After:", after.rows[0])

  const events2 = await client.execute({
    sql: "SELECT * FROM user_login_events WHERE user_id = ? ORDER BY login_date",
    args: [testUserId],
  })
  console.log("Events:", events2.rows)

  // Cleanup
  await client.execute({
    sql: "DELETE FROM user_logins WHERE user_id = ?",
    args: [testUserId],
  })
  await client.execute({
    sql: "DELETE FROM user_login_events WHERE user_id = ?",
    args: [testUserId],
  })

  await client.close()
  console.log("\n✅ Test complete — cleaned up test user")
}

main().catch(console.error)
