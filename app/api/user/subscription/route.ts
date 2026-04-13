import { auth } from "@clerk/nextjs/server"
import { getClient } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  const { userId } = await auth()

  //temporary for troubleshooting!
  console.log("Clerk userId:", userId) // Add this


  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  try {
    const db = getClient()
    
    const result = await db.execute({
      sql: `
        SELECT tier, status, started_at, expires_at, founding_number
        FROM subscriptions
        WHERE user_id = ?
      `,
      args: [userId]
    })

    
    if (result.rows.length === 0) {
      // No subscription found - return free tier
      return NextResponse.json({
        tier: 'free',
        status: 'active',
        startedAt: null,
        expiresAt: null
      })
    }
    
    const row = result.rows[0]
    
    return NextResponse.json({
      tier: String(row.tier),
      status: String(row.status),
      startedAt: row.started_at ? String(row.started_at) : null,
      expiresAt: row.expires_at ? String(row.expires_at) : null,
      foundingNumber: row.founding_number ? Number(row.founding_number) : null
    })
    
  } catch (error) {
    console.error("Failed to fetch subscription:", error)
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    )
  }
}
