/**
 * Single Deck API - Fetch full deck data including items
 * 
 * GET: Get a single deck with all card items
 * Used when user selects a specific deck
 */

import { auth } from "@clerk/nextjs/server"
import { getClient } from "@/lib/db"
import { isProUser } from "@/lib/subscription"
import { NextRequest } from "next/server"

export const dynamic = 'force-dynamic'

// GET /api/decks/[id] - Get single deck with items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  const { id } = await params
  
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
  
  if (!id) {
    return Response.json(
      { error: "Deck ID required" },
      { status: 400 }
    )
  }
  
  try {
    const db = getClient()
    
    const result = await db.execute({
      sql: `
        SELECT id, name, items, is_active, created_at, updated_at
        FROM decks
        WHERE id = ? AND user_id = ?
      `,
      args: [id, userId]
    })
    
    if (result.rows.length === 0) {
      return Response.json(
        { error: "Deck not found" },
        { status: 404 }
      )
    }
    
    const row = result.rows[0]
    const deck = {
      id: String(row.id),
      name: String(row.name),
      items: JSON.parse(String(row.items)),
      isActive: Boolean(row.is_active),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }
    
    return Response.json({ deck })
    
  } catch (error) {
    console.error("[DeckDetail] Failed to fetch deck:", error)
    return Response.json(
      { error: "Failed to fetch deck" },
      { status: 500 }
    )
  }
}
