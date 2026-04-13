/**
 * Test cursor-based pagination
 */

import { config } from 'dotenv'
import * as path from 'path'

config({ path: path.resolve(process.cwd(), '.env.local') })

// Import the function directly
import { searchCardsCursor, searchCardsCount } from '../lib/db'

async function test() {
  console.log('Testing cursor-based pagination...\n')

  const query = 'charizard'
  const limit = 10

  // First page (no cursor)
  console.log('--- Page 1 (no cursor) ---')
  const page1 = await searchCardsCursor(query, limit)
  console.log(`Results: ${page1.cards.length}`)
  console.log(`Has more: ${page1.hasMore}`)
  console.log(`Next cursor: ${page1.nextCursor}`)
  console.log('First card:', page1.cards[0]?.name)
  console.log('Last card:', page1.cards[page1.cards.length - 1]?.name)

  if (page1.nextCursor) {
    // Second page
    console.log('\n--- Page 2 (cursor=' + page1.nextCursor + ') ---')
    const page2 = await searchCardsCursor(query, limit, page1.nextCursor)
    console.log(`Results: ${page2.cards.length}`)
    console.log(`Has more: ${page2.hasMore}`)
    console.log(`Next cursor: ${page2.nextCursor}`)
    console.log('First card:', page2.cards[0]?.name)
    console.log('Last card:', page2.cards[page2.cards.length - 1]?.name)

    if (page2.nextCursor) {
      // Third page
      console.log('\n--- Page 3 (cursor=' + page2.nextCursor + ') ---')
      const page3 = await searchCardsCursor(query, limit, page2.nextCursor)
      console.log(`Results: ${page3.cards.length}`)
      console.log(`Has more: ${page3.hasMore}`)
      console.log(`Next cursor: ${page3.nextCursor}`)
      console.log('First card:', page3.cards[0]?.name)
    }
  }

  // Get total count
  console.log('\n--- Total Count ---')
  const total = await searchCardsCount(query)
  console.log(`Total matches: ${total}`)
}

test().catch(console.error)
