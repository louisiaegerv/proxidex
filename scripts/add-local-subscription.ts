/**
 * Add subscription for local dev user
 * Run: npx tsx scripts/add-local-subscription.ts
 */

import fs from 'fs'
import path from 'path'
import initSqlJs from 'sql.js'

const LOCAL_USER_ID = 'user_3C1DF9Y4WVhA1xsfhZb0ilEOXXA'

async function main() {
  const dbPath = path.join(process.cwd(), 'cards.db')
  
  // Load sql.js
  const SQL = await initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`
  })
  
  // Read existing database
  const filebuffer = fs.readFileSync(dbPath)
  const db = new SQL.Database(filebuffer)
  
  // Check if user already has subscription
  const checkResult = db.exec(`SELECT * FROM subscriptions WHERE user_id = '${LOCAL_USER_ID}'`)
  
  if (checkResult.length > 0 && checkResult[0].values.length > 0) {
    console.log('User already has subscription:')
    console.log(checkResult[0].values[0])
  } else {
    // Insert subscription
    db.exec(`
      INSERT INTO subscriptions (user_id, tier, status, founding_number, created_at, updated_at)
      VALUES ('${LOCAL_USER_ID}', 'founding_alpha', 'active', 1, datetime('now'), datetime('now'))
    `)
    
    console.log('Added subscription for local user:', LOCAL_USER_ID)
  }
  
  // Verify
  const verifyResult = db.exec(`SELECT * FROM subscriptions WHERE user_id = '${LOCAL_USER_ID}'`)
  console.log('Current subscription:')
  if (verifyResult.length > 0) {
    console.log('Columns:', verifyResult[0].columns)
    console.log('Values:', verifyResult[0].values[0])
  }
  
  // Save database
  const data = db.export()
  fs.writeFileSync(dbPath, Buffer.from(data))
  console.log('Database saved!')
  
  db.close()
}

main().catch(console.error)
