/**
 * User Profile API - Cloud sync for settings
 * 
 * GET: Get user settings
 * PUT: Update user settings
 * 
 * NOTE: Pro users only
 */

import { auth } from "@clerk/nextjs/server"
import { getClient } from "@/lib/db"
import { isProUser } from "@/lib/subscription"
import { NextRequest } from "next/server"

// GET /api/user/profile - Get user settings
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
      sql: `SELECT settings FROM user_profiles WHERE user_id = ?`,
      args: [userId]
    })
    
    if (result.rows.length === 0) {
      // No profile yet, return null
      return Response.json({ settings: null })
    }
    
    const settings = JSON.parse(String(result.rows[0].settings))
    return Response.json({ settings })
    
  } catch (error) {
    console.error("Failed to fetch profile:", error)
    return Response.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    )
  }
}

// PUT /api/user/profile - Save user settings
export async function PUT(request: NextRequest) {
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
    const { settings } = await request.json()
    
    if (!settings) {
      return Response.json(
        { error: "Settings required" },
        { status: 400 }
      )
    }
    
    const db = getClient()
    
    await db.execute({
      sql: `
        INSERT INTO user_profiles (user_id, settings, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
          settings = excluded.settings,
          updated_at = datetime('now')
      `,
      args: [userId, JSON.stringify(settings)]
    })
    
    return Response.json({ 
      success: true,
      syncedAt: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("Failed to save profile:", error)
    return Response.json(
      { error: "Failed to save profile" },
      { status: 500 }
    )
  }
}
