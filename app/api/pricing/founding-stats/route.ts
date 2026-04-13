import { getClient } from "@/lib/db"
import { NextResponse } from "next/server"

/**
 * GET /api/pricing/founding-stats
 * Returns real-time founding trainer tier stats
 */
export async function GET() {
  try {
    const db = getClient()
    
    // Get count for each founding tier
    const [alphaResult, betaResult, gammaResult] = await Promise.all([
      db.execute({
        sql: `SELECT COUNT(*) as count FROM subscriptions WHERE tier = 'founding_alpha'`,
        args: []
      }),
      db.execute({
        sql: `SELECT COUNT(*) as count FROM subscriptions WHERE tier = 'founding_beta'`,
        args: []
      }),
      db.execute({
        sql: `SELECT COUNT(*) as count FROM subscriptions WHERE tier = 'founding_gamma'`,
        args: []
      })
    ])
    
    const stats = {
      alpha: {
        sold: Number(alphaResult.rows[0]?.count || 0),
        limit: 100
      },
      beta: {
        sold: Number(betaResult.rows[0]?.count || 0),
        limit: 150
      },
      gamma: {
        sold: Number(gammaResult.rows[0]?.count || 0),
        limit: 250
      }
    }
    
    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching founding stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}
