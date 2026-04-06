import { NextRequest } from 'next/server'
import { getAllSets } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const sets = await getAllSets()
    
    return Response.json({
      sets,
      count: sets.length
    })
  } catch (error) {
    console.error('Sets API error:', error)
    
    return Response.json(
      { 
        error: 'Failed to fetch sets',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
