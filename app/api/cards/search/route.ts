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
 *   - limit: max results (default: 50)
 */

import { NextRequest } from 'next/server'
import { searchCards, getCardsBySet, parseSearchQuery } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const setFilter = searchParams.get('set') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    
    let cards
    
    // If set filter is provided without query, get all cards in set
    if (setFilter && !query.trim()) {
      cards = await getCardsBySet(setFilter)
    } else if (query.trim()) {
      // Perform the search
      cards = await searchCards(query, limit)
      
      // Further filter by set if specified
      if (setFilter) {
        cards = cards.filter(card => card.set_code === setFilter)
      }
    } else {
      // No query, no set filter
      return Response.json({ 
        cards: [], 
        count: 0,
        query: '',
        parsed: null
      })
    }
    
    // Parse the query for debugging info
    const parsed = parseSearchQuery(query)
    
    return Response.json({
      cards,
      count: cards.length,
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
