/**
 * Card Search API Route
 * 
 * Supports flexible search with comma delimiter:
 *   - "Pikachu" -> Search card names
 *   - "OBF" -> Search by set code
 *   - "Pikachu,Jungle" -> Card name + set
 *   - "Charizard, OBF" -> Card name + set code
 * 
 * Query params:
 *   - q: search query
 *   - set: filter by set code
 *   - limit: max results (default: 30)
 *   - cursor: rowid for cursor-based pagination (more efficient than offset)
 *   - total: total count from previous request (optional, skips count query)
 */

import { NextRequest } from 'next/server'
import { 
  searchCardsCursor, 
  searchCardsCount, 
  getCardsBySet, 
  getCardsBySetCount, 
  parseSearchQuery 
} from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const setFilter = searchParams.get('set') || ''
    const isSetOnly = !query.trim() && setFilter
    const limit = Math.min(parseInt(searchParams.get('limit') || (isSetOnly ? '20' : '30'), 10), 100)
    
    // Cursor-based pagination (preferred for FTS)
    const cursor = searchParams.get('cursor') || ''
    
    // Client can provide total from previous request to skip expensive count query
    const providedTotal = parseInt(searchParams.get('total') || '0', 10)
    
    let cards
    let total = providedTotal || 0
    let nextCursor: string | null = null
    
    // If set filter is provided without query, get paginated cards in set
    if (isSetOnly) {
      // For set-only, use offset since we order by local_id
      const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)
      cards = await getCardsBySet(setFilter, limit, offset)
      total = await getCardsBySetCount(setFilter)
      
      // Simple hasMore check for offset-based
      const hasMore = offset + cards.length < total
      
      return Response.json({
        cards,
        count: cards.length,
        total,
        hasMore,
        offset: offset + cards.length,
        query: '',
        parsed: { cardName: null, setCode: setFilter, setName: null }
      })
    }
    
    if (!query.trim()) {
      return Response.json({ 
        cards: [], 
        count: 0,
        total: 0,
        hasMore: false,
        query: '',
        parsed: null
      })
    }
    
    // Perform the search with cursor-based pagination
    const result = await searchCardsCursor(query, limit, cursor || undefined, setFilter || undefined)
    cards = result.cards
    nextCursor = result.nextCursor
    
    // Only get total count if not provided by client
    // This saves ~100+ row reads on pagination requests
    if (!providedTotal) {
      total = await searchCardsCount(query, setFilter || undefined)
    }
    
    // Parse the query for debugging info
    const parsed = parseSearchQuery(query)
    
    return Response.json({
      cards,
      count: cards.length,
      total,
      hasMore: result.hasMore,
      cursor: nextCursor,
      query: query.trim(),
      parsed: {
        cardName: parsed.cardName || null,
        setCode: parsed.setCode || setFilter || null,
        setName: parsed.setName || null
      }
    })
    
  } catch (error) {
    console.error('Search error:', error)
    
    return Response.json(
      { 
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
