/**
 * Add pre-computed count table with triggers for Turso optimization
 * 
 * This implements the strategy from:
 * https://turso.tech/blog/tips-for-maximizing-your-turso-billing-allowances-48a0fca163e9
 * 
 * COUNT(*) queries scan all rows - with 20k+ cards, that's 20k row reads per count.
 * Triggers maintain pre-computed counts so we only read 1 row.
 */

import initSqlJs from 'sql.js'
import { createClient } from '@libsql/client/web'
import * as fs from 'fs'
import * as path from 'path'

async function main() {
  const isTurso = process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN
  
  if (isTurso) {
    console.log('Running on Turso (production)...')
    await setupTurso()
  } else {
    console.log('Running on local SQLite...')
    await setupLocal()
  }
  
  console.log('\n✅ Count optimization setup complete!')
}

async function setupLocal() {
  const dbPath = path.join(process.cwd(), 'cards.db')
  
  if (!fs.existsSync(dbPath)) {
    console.error('Database not found:', dbPath)
    process.exit(1)
  }
  
  const SQL = await initSqlJs({
    locateFile: (file) => {
      const wasmPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file)
      if (fs.existsSync(wasmPath)) {
        return wasmPath
      }
      return `https://sql.js.org/dist/${file}`
    }
  })
  
  const filebuffer = fs.readFileSync(dbPath)
  const db = new SQL.Database(filebuffer)
  
  // Create table for pre-computed counts
  db.run(`
    CREATE TABLE IF NOT EXISTS card_counts (
      count_type TEXT PRIMARY KEY,
      count_value INTEGER NOT NULL
    );
    
    -- Initialize total count
    INSERT OR REPLACE INTO card_counts (count_type, count_value)
    SELECT 'total', COUNT(*) FROM cards;
    
    -- Initialize per-set counts
    DELETE FROM card_counts WHERE count_type LIKE 'set:%';
    INSERT INTO card_counts (count_type, count_value)
    SELECT 'set:' || set_code, COUNT(*)
    FROM cards
    GROUP BY set_code;
  `)
  
  // Create triggers to maintain counts
  db.run(`
    -- After insert on cards: increment total and set-specific count
    CREATE TRIGGER IF NOT EXISTS trg_cards_insert_count
    AFTER INSERT ON cards
    BEGIN
      UPDATE card_counts 
      SET count_value = count_value + 1 
      WHERE count_type = 'total';
      
      INSERT INTO card_counts (count_type, count_value)
      VALUES ('set:' || NEW.set_code, 1)
      ON CONFLICT(count_type) DO UPDATE SET count_value = count_value + 1;
    END;
    
    -- After delete on cards: decrement total and set-specific count
    CREATE TRIGGER IF NOT EXISTS trg_cards_delete_count
    AFTER DELETE ON cards
    BEGIN
      UPDATE card_counts 
      SET count_value = count_value - 1 
      WHERE count_type = 'total';
      
      UPDATE card_counts 
      SET count_value = count_value - 1 
      WHERE count_type = 'set:' || OLD.set_code;
    END;
  `)
  
  // Write back to file
  const data = db.export()
  fs.writeFileSync(dbPath, Buffer.from(data))
  db.close()
  
  console.log('  - Created card_counts table')
  console.log('  - Created insert/delete triggers')
}

async function setupTurso() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN required')
    process.exit(1)
  }
  
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })
  
  // Create table for pre-computed counts
  await client.execute({
    sql: `
      CREATE TABLE IF NOT EXISTS card_counts (
        count_type TEXT PRIMARY KEY,
        count_value INTEGER NOT NULL
      )
    `,
    args: []
  })
  
  // Initialize total count
  await client.execute({
    sql: `
      INSERT OR REPLACE INTO card_counts (count_type, count_value)
      SELECT 'total', COUNT(*) FROM cards
    `,
    args: []
  })
  
  // Initialize per-set counts
  await client.execute({
    sql: `DELETE FROM card_counts WHERE count_type LIKE 'set:%'`,
    args: []
  })
  
  await client.execute({
    sql: `
      INSERT INTO card_counts (count_type, count_value)
      SELECT 'set:' || set_code, COUNT(*)
      FROM cards
      GROUP BY set_code
    `,
    args: []
  })
  
  // Create triggers
  await client.execute({
    sql: `
      CREATE TRIGGER IF NOT EXISTS trg_cards_insert_count
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
  
  await client.execute({
    sql: `
      CREATE TRIGGER IF NOT EXISTS trg_cards_delete_count
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
  
  console.log('  - Created card_counts table')
  console.log('  - Created insert/delete triggers')
}

main().catch(console.error)
