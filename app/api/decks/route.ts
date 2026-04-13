/**
 * Decks API - Cloud sync for user decks
 * 
 * GET: List all decks for current user
 * POST: Create or update a deck
 * DELETE: Delete a deck
 * 
 * NOTE: Pro users only
 */

import { auth } from "@clerk/nextjs/server"
import { getClient } from "@/lib/db"
import { isProUser } from "@/lib/subscription"
import { NextRequest } from "next/server"

// GET /api/decks - List user's decks
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
    
    const result = await db.execute({
      sql: `
        SELECT id, name, items, is_active, created_at, updated_at
        FROM decks
        WHERE user_id = ?
        ORDER BY updated_at DESC
      `,
      args: [userId]
    })
    
    const decks = result.rows.map(row => ({
      id: String(row.id),
      name: String(row.name),
      items: JSON.parse(String(row.items)),
      isActive: Boolean(row.is_active),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }))
    
    return Response.json({ decks })
    
  } catch (error) {
    console.error("Failed to fetch decks:", error)
    return Response.json(
      { error: "Failed to fetch decks" },
      { status: 500 }
    )
  }
}

// POST /api/decks - Save a deck
export async function POST(request: NextRequest) {
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
    const body = await request.json()
    const { id, name, items, isActive = false } = body
    
    if (!id || !name || !items) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }
    
    const db = getClient()
    
    // If setting this deck as active, deactivate others
    if (isActive) {
      await db.execute({
        sql: `UPDATE decks SET is_active = 0 WHERE user_id = ?`,
        args: [userId]
      })
    }
    
    // Upsert deck
    await db.execute({
      sql: `
        INSERT INTO decks (id, user_id, name, items, is_active, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          items = excluded.items,
          is_active = excluded.is_active,
          updated_at = datetime('now')
      `,
      args: [id, userId, name, JSON.stringify(items), isActive ? 1 : 0]
    })
    
    return Response.json({ 
      success: true, 
      id,
      syncedAt: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("Failed to save deck:", error)
    return Response.json(
      { error: "Failed to save deck" },
      { status: 500 }
    )
  }
}

// DELETE /api/decks?id=xxx - Delete a deck
export async function DELETE(request: NextRequest) {
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
  
  const { searchParams } = new URL(request.url)
  const deckId = searchParams.get("id")
  
  if (!deckId) {
    return Response.json(
      { error: "Deck ID required" },
      { status: 400 }
    )
  }
  
  try {
    const db = getClient()
    
    await db.execute({
      sql: `DELETE FROM decks WHERE id = ? AND user_id = ?`,
      args: [deckId, userId]
    })
    
    return Response.json({ success: true })
    
  } catch (error) {
    console.error("Failed to delete deck:", error)
    return Response.json(
      { error: "Failed to delete deck" },
      { status: 500 }
    )
  }
}
