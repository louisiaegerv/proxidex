/**
 * Debug endpoint to trace a search query
 */

import { NextRequest } from 'next/server'
import { searchCardsCursor, searchCardsCount, isFTSAvailable } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || 'entei'
  
  const logs: string[] = []
  const originalLog = console.log
  console.log = (...args: any[]) => {
    const msg = args.join(' ')
    logs.push(msg)
    originalLog(...args)
  }
  
  try {
    // Reset FTS cache
    ;(globalThis as any).__ftsAvailable = undefined
    
    logs.push(`=== Searching for: "${query}" ===`)
    
    // Check FTS availability
    const ftsAvailable = await isFTSAvailable()
    logs.push(`FTS Available: ${ftsAvailable}`)
    
    // Perform search
    const startTime = Date.now()
    const result = await searchCardsCursor(query, 5)
    const duration = Date.now() - startTime
    
    logs.push(`Found ${result.cards.length} cards in ${duration}ms`)
    logs.push(`Has more: ${result.hasMore}`)
    logs.push(`Next cursor: ${result.nextCursor}`)
    
    // Get count
    const countStart = Date.now()
    const count = await searchCardsCount(query)
    const countDuration = Date.now() - countStart
    
    logs.push(`Total count: ${count} (took ${countDuration}ms)`)
    
    return Response.json({
      query,
      ftsAvailable,
      result: {
        cards: result.cards.map(c => ({ id: c.id, name: c.name })),
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      },
      count,
      timings: {
        search: duration,
        count: countDuration,
      },
      logs,
    })
  } catch (error: any) {
    return Response.json({
      error: error.message,
      logs,
    }, { status: 500 })
  } finally {
    console.log = originalLog
  }
}
