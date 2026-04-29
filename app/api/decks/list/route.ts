/**
 * Decks List API - Lightweight endpoint for deck metadata only
 * 
 * GET: List all decks with metadata (no card items)
 * Used for initial load to show deck list without fetching all cards
 */

import { auth } from "@clerk/nextjs/server"
import { getClient } from "@/lib/db"
import { isProUser } from "@/lib/subscription"

export const dynamic = 'force-dynamic'

// GET /api/decks/list - List deck metadata only (no items)
export async function GET() {
  const { userId } = await auth()
  
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  // Check Pro subscription
  const isPro = await isProUser(userId)
  if (!isPro) {
    return Response.json(
      { error: "Pro subscription required" },
      { status: 403 }
    )
  }
  
  try {
    const db = getClient()
    
    console.log(`[DecksList] Querying for userId: ${userId}, DB URL: ${process.env.TURSO_DATABASE_URL}`)
    
    // Fetch only metadata, not the items JSON
    const result = await db.execute({
      sql: `
        SELECT 
          id, 
          name, 
          is_active, 
          created_at, 
          updated_at,
          LENGTH(items) as items_size
        FROM decks
        WHERE user_id = ?
        ORDER BY updated_at DESC
      `,
      args: [userId]
    })
    
    console.log(`[DecksList] Raw DB rows returned: ${result.rows.length}`)
    result.rows.forEach((row, i) => {
      console.log(`[DecksList] Row ${i}: id=${row.id}, name=${row.name}, is_active=${row.is_active}`)
    })
    
    const decks = result.rows.map(row => ({
      id: String(row.id),
      name: String(row.name),
      isActive: Boolean(row.is_active),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      // Estimate card count from JSON size (rough heuristic)
      // Each card is roughly 200-500 bytes in JSON
      cardCount: Math.max(0, Math.floor((Number(row.items_size) || 0) / 300))
    }))
    
    console.log(`[DecksList] Returning ${decks.length} decks`)
    
    return Response.json({ decks })
    
  } catch (error) {
    console.error("[DecksList] Failed to fetch decks:", error)
    return Response.json(
      { error: "Failed to fetch decks" },
      { status: 500 }
    )
  }
}
