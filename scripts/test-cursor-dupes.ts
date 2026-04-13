/**
 * Test if cursor pagination returns duplicates
 */

import { config } from 'dotenv'
import * as path from 'path'

config({ path: path.resolve(process.cwd(), '.env.local') })

import { searchCardsCursor } from '../lib/db'

async function test() {
  console.log('Testing for duplicate cards in cursor pagination...\n')

  const query = 'charizard'
  const limit = 10
  const seenIds = new Set<string>()
  const duplicates: string[] = []
  let cursor: string | undefined
  let pageNum = 1

  while (pageNum <= 5) {
    console.log(`--- Page ${pageNum} ---`)
    const result = await searchCardsCursor(query, limit, cursor)
    
    console.log(`Got ${result.cards.length} cards`)
    
    for (const card of result.cards) {
      if (seenIds.has(card.id)) {
        duplicates.push(card.id)
        console.log(`  ⚠️ DUPLICATE: ${card.id}`)
      } else {
        seenIds.add(card.id)
        console.log(`  ✓ ${card.id}`)
      }
    }
    
    if (!result.hasMore || !result.nextCursor) {
      console.log('No more pages')
      break
    }
    
    cursor = result.nextCursor || undefined
    console.log(`Next cursor: ${cursor}\n`)
    pageNum++
  }

  console.log('\n=== SUMMARY ===')
  console.log(`Total unique cards: ${seenIds.size}`)
  console.log(`Duplicates found: ${duplicates.length}`)
  if (duplicates.length > 0) {
    console.log(`Duplicate IDs: ${duplicates.join(', ')}`)
  }
}

test().catch(console.error)
