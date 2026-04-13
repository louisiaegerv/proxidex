import { auth } from "@clerk/nextjs/server"
import { recordExport, canUserExport } from "@/lib/exports"
import { getClient } from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST() {
  const { userId } = await auth()
  
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }
  
  try {
    // Check if user has Pro subscription
    const db = getClient()
    const subResult = await db.execute({
      sql: `SELECT tier FROM subscriptions WHERE user_id = ? AND status = 'active'`,
      args: [userId]
    })
    
    const isPro = subResult.rows.length > 0 && 
                  (subResult.rows[0].tier === 'pro' || subResult.rows[0].tier === 'founding')
    
    // Check if user can export
    const canExport = await canUserExport(userId, isPro)
    
    if (!canExport) {
      return NextResponse.json(
        { error: "Export limit reached. Upgrade to Pro for unlimited exports." },
        { status: 429 }
      )
    }
    
    // Record the export and get which type was consumed
    const exportType = await recordExport(userId)
    
    return NextResponse.json({ 
      success: true,
      exportType,
      isPro
    })
  } catch (error) {
    console.error("Error recording export:", error)
    return NextResponse.json(
      { error: "Failed to record export" },
      { status: 500 }
    )
  }
}
