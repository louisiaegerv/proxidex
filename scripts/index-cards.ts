/**
 * Index Cards Script
 * 
 * Scans your image folders and populates the SQLite database.
 * Run this after init-db.ts and whenever you add new sets.
 * 
 * Usage: npx tsx scripts/index-cards.ts
 */

import { config } from 'dotenv'
config({ path: '.env.local' })
import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js'
import fs from 'fs'
import { readdir } from 'fs/promises'
import path from 'path'
import { SET_MAPPINGS } from '../lib/set-mappings'

const DB_PATH = path.join(process.cwd(), 'cards.db')
const IMAGE_PATH = process.env.LOCAL_IMAGES_PATH

if (!IMAGE_PATH) {
  console.error('Error: LOCAL_IMAGES_PATH environment variable is not set')
  console.error('Please set it in your .env.local file:')
  console.error('  LOCAL_IMAGES_PATH=C:\\Users\\louis\\Coding\\pokemon-card-images\\images')
  process.exit(1)
}

console.log('Connecting to database:', DB_PATH)
console.log('Scanning images at:', IMAGE_PATH)
console.log('')

// Track stats
let totalCards = 0
let totalSets = 0

async function indexCards() {
  if (!IMAGE_PATH) {
    console.error('Error: LOCAL_IMAGES_PATH environment variable is not set')
    process.exit(1)
  }
  
  try {
    const SQL = await initSqlJs()
    
    // Load existing database or create new
    let db: SqlJsDatabase
    if (fs.existsSync(DB_PATH)) {
      const filebuffer = fs.readFileSync(DB_PATH)
      db = new SQL.Database(filebuffer)
    } else {
      console.error('Database not found. Run init-db.ts first.')
      process.exit(1)
    }
    
    // Clear existing data
    db.run('DELETE FROM cards;')
    
    const sets = await readdir(IMAGE_PATH)
    
    // Prepare insert statement
    const insertStmt = db.prepare(`
      INSERT INTO cards (id, name, set_code, set_name, local_id, folder_name, variants, sizes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    for (const folder of sets) {
      const folderPath = path.join(IMAGE_PATH, folder)
      
      // Skip non-directory items
      const stats = await import('fs').then(fs => fs.promises.stat(folderPath))
      if (!stats.isDirectory()) {
        console.log(`Skipping ${folder} (not a directory)`)
        continue
      }
      
      const files = await readdir(folderPath)
      
      // Group files by card (multiple sizes/variants per card)
      const cardMap = new Map<string, {
        name: string
        setCode: string
        setName: string
        localId: string
        variants: Set<string>
        sizes: Set<string>
      }>()
      
      // Extract set code from folder name (e.g., "Ancient_Origins_AOR" -> "AOR")
      const folderMatch = folder.match(/_([A-Z0-9]+)$/)
      if (!folderMatch) {
        console.log(`Skipping ${folder} (cannot extract set code from folder name)`)
        continue
      }
      const expectedSetCode = folderMatch[1]
      const setName = SET_MAPPINGS[expectedSetCode]?.name || expectedSetCode
      
      for (const file of files) {
        // Skip non-webp files
        if (!file.endsWith('.webp')) continue
        
        // Parse filename using the known set code
        // Format: {CardName}_{SetCode}_{LocalId}_{Variant?}_{Size}.webp
        // Example: Ace_Trainer_AOR_69_lg.webp
        //          |<--CardName-->|<->|<->|<--Size--->|
        //                         AOR  69   lg
        
        // Find the set code position in filename
        const setCodeIndex = file.indexOf(`_${expectedSetCode}_`)
        if (setCodeIndex === -1) {
          // Try case-insensitive match
          const lowerFile = file.toLowerCase()
          const lowerSetCode = expectedSetCode.toLowerCase()
          const idx = lowerFile.indexOf(`_${lowerSetCode}_`)
          if (idx === -1) {
            console.log(`  ⚠️  Skipping ${file} (set code ${expectedSetCode} not found)`)
            continue
          }
        }
        
        // Extract parts
        const actualSetCodeIndex = file.indexOf(`_${expectedSetCode}_`)
        const cardNamePart = file.substring(0, actualSetCodeIndex)
        const afterSetCode = file.substring(actualSetCodeIndex + 1 + expectedSetCode.length + 1) // Remove _{set}_
        
        // Parse remaining: {LocalId}_{Variant?}_{Size}.webp
        // Examples: "69_lg.webp", "69_holo_lg.webp", "TG4_lg.webp", "R_lg.webp"
        const parts = afterSetCode.split('_')
        
        // Last part is size (before .webp)
        const sizeWithExt = parts[parts.length - 1]
        const size = sizeWithExt.replace('.webp', '')
        
        // Check if second-to-last is a variant
        let localId: string
        let variant: string | undefined
        
        if (parts.length >= 3 && ['holo', 'reverse'].includes(parts[parts.length - 2].toLowerCase())) {
          // Has variant: "69_holo_lg.webp"
          localId = parts.slice(0, parts.length - 2).join('_')
          variant = parts[parts.length - 2].toLowerCase()
        } else if (parts.length >= 2) {
          // No variant: "69_lg.webp"
          localId = parts.slice(0, parts.length - 1).join('_')
        } else {
          console.log(`  ⚠️  Skipping ${file} (cannot parse local ID)`)
          continue
        }
        
        // Validate size
        if (!['sm', 'md', 'lg', 'xl'].includes(size.toLowerCase())) {
          console.log(`  ⚠️  Skipping ${file} (invalid size: ${size})`)
          continue
        }
        
        // Normalize localId to uppercase
        const normalizedLocalId = localId.toUpperCase()
        const cardId = `${expectedSetCode}-${normalizedLocalId}`
        
        // Convert underscores to spaces in card name
        const cardName = cardNamePart.replace(/_/g, ' ')
        
        if (!cardMap.has(cardId)) {
          cardMap.set(cardId, {
            name: cardName,
            setCode: expectedSetCode,
            setName,
            localId: normalizedLocalId,
            variants: new Set(['normal']),
            sizes: new Set()
          })
        }
        
        const card = cardMap.get(cardId)!
        if (variant) {
          card.variants.add(variant)
        }
        card.sizes.add(size.toLowerCase())
      }
      
      // Insert into database
      for (const [id, card] of cardMap) {
        insertStmt.run([
          id,
          card.name,
          card.setCode,
          card.setName,
          card.localId,
          folder,
          Array.from(card.variants).join(','),
          Array.from(card.sizes).join(',')
        ])
      }
      
      if (cardMap.size > 0) {
        console.log(`✅ ${folder}: ${cardMap.size} cards indexed`)
        totalSets++
        totalCards += cardMap.size
      }
    }
    
    // Save database
    const data = db.export()
    fs.writeFileSync(DB_PATH, Buffer.from(data))
    
    console.log('')
    console.log('========================================')
    console.log('Indexing complete!')
    console.log(`Sets processed: ${totalSets}`)
    console.log(`Total cards: ${totalCards}`)
    console.log('========================================')
    
    db.close()
    
  } catch (error) {
    console.error('Error indexing cards:', error)
    process.exit(1)
  }
}

indexCards()
