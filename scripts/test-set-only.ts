/**
 * Test set-only search
 */

import { config } from 'dotenv'
import * as path from 'path'

config({ path: path.resolve(process.cwd(), '.env.local') })

import { getCardsBySet, getCardsBySetCount } from '../lib/db'

async function test() {
  console.log('Testing set-only search...\n')

  const setCode = 'OBF'
  const limit = 10
  const offset = 0

  console.log(`Query: set_code="${setCode}", limit=${limit}, offset=${offset}`)
  
  try {
    const cards = await getCardsBySet(setCode, limit, offset)
    console.log(`Results: ${cards.length} cards`)
    
    if (cards.length > 0) {
      console.log('First card:', cards[0].name, `(${cards[0].set_code})`)
    }
    
    const count = await getCardsBySetCount(setCode)
    console.log(`Total count: ${count}`)
  } catch (e: any) {
    console.error('Error:', e.message)
  }
}

test().catch(console.error)
