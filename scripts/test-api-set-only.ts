/**
 * Test set-only API endpoint
 */

import { config } from 'dotenv'
import * as path from 'path'

config({ path: path.resolve(process.cwd(), '.env.local') })

async function test() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const setCode = 'OBF'
  
  console.log(`Testing API: ${baseUrl}/api/cards/search?set=${setCode}&limit=10\n`)
  
  try {
    const response = await fetch(`${baseUrl}/api/cards/search?set=${encodeURIComponent(setCode)}&limit=10`)
    console.log('Response status:', response.status)
    
    if (response.ok) {
      const data = await response.json()
      console.log('Response:', JSON.stringify(data, null, 2))
    } else {
      const text = await response.text()
      console.log('Error response:', text)
    }
  } catch (e: any) {
    console.error('Fetch error:', e.message)
  }
}

test().catch(console.error)
