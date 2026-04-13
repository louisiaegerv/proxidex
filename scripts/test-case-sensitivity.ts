import { config } from 'dotenv'
import { createClient } from '@libsql/client/web'
import * as path from 'path'

config({ path: path.resolve(process.cwd(), '.env.local') })

async function test() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  })

  console.log('Testing case sensitivity...\n')
  
  const queries = ['charizard', 'Charizard', 'CHARIZARD', 'char*', 'Char*']
  
  for (const q of queries) {
    const sql = `SELECT COUNT(*) as c FROM cards c JOIN cards_fts f ON c.rowid = f.rowid WHERE f.cards_fts MATCH '${q}'`
    const result = await client.execute({ sql, args: [] })
    console.log(`${q}: ${result.rows[0].c} matches`)
  }
}

test().catch(console.error)
