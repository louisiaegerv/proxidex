/**
 * Setup card_counts table with triggers on Turso
 * 
 * This creates pre-computed counts for fast set-based queries.
 * Run once on Turso to enable ~1 row read counts instead of scanning.
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
    console.error('Run: npx tsx scripts/setup-card-counts-turso.ts')
    process.exit(1)
  }

  console.log(`Connecting to Turso...`)

  const client = createClient({ url, authToken: token })

  console.log('Setting up card_counts table...')

  // Drop existing table if any
  console.log('  Dropping existing table if present...')
  await client.execute({ sql: 'DROP TABLE IF EXISTS card_counts', args: [] })

  // Create card_counts table
  console.log('  Creating card_counts table...')
  await client.execute({
    sql: `
      CREATE TABLE card_counts (
        count_type TEXT PRIMARY KEY,
        count_value INTEGER NOT NULL
      )
    `,
    args: []
  })

  // Initialize total count
  console.log('  Initializing total count...')
  await client.execute({
    sql: `
      INSERT INTO card_counts (count_type, count_value)
      SELECT 'total', COUNT(*) FROM cards
    `,
    args: []
  })

  // Initialize per-set counts
  console.log('  Initializing per-set counts...')
  await client.execute({
    sql: `
      INSERT INTO card_counts (count_type, count_value)
      SELECT 'set:' || set_code, COUNT(*)
      FROM cards
      GROUP BY set_code
    `,
    args: []
  })

  // Create triggers to maintain counts
  console.log('  Creating triggers...')

  // After insert: increment counts
  await client.execute({
    sql: `
      CREATE TRIGGER trg_cards_insert_count
      AFTER INSERT ON cards
      BEGIN
        UPDATE card_counts 
        SET count_value = count_value + 1 
        WHERE count_type = 'total';
        
        INSERT INTO card_counts (count_type, count_value)
        VALUES ('set:' || NEW.set_code, 1)
        ON CONFLICT(count_type) DO UPDATE SET count_value = count_value + 1;
      END
    `,
    args: []
  })

  // After delete: decrement counts
  await client.execute({
    sql: `
      CREATE TRIGGER trg_cards_delete_count
      AFTER DELETE ON cards
      BEGIN
        UPDATE card_counts 
        SET count_value = count_value - 1 
        WHERE count_type = 'total';
        
        UPDATE card_counts 
        SET count_value = count_value - 1 
        WHERE count_type = 'set:' || OLD.set_code;
      END
    `,
    args: []
  })

  // Verify setup
  console.log('\n  Verifying setup...')
  const totalResult = await client.execute({
    sql: "SELECT count_value FROM card_counts WHERE count_type = 'total'",
    args: []
  })
  console.log(`    Total cards: ${totalResult.rows[0]?.count_value || 0}`)

  const setCountResult = await client.execute({
    sql: "SELECT COUNT(*) as count FROM card_counts WHERE count_type LIKE 'set:%'",
    args: []
  })
  console.log(`    Sets tracked: ${setCountResult.rows[0]?.count || 0}`)

  console.log('\n✅ card_counts setup complete!')
  console.log('\nBenefits:')
  console.log('  - Set-only count queries: 1 row read (was ~100-500)')
  console.log('  - Total card count: 1 row read (was ~20,000)')
  console.log('\nThe triggers will auto-update counts on INSERT/DELETE.')
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
