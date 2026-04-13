/**
 * Turso Stats Debug Endpoint
 * 
 * View real-time Turso query stats to track Class B operations
 * 
 * GET: View current stats
 * POST: Reset stats
 */

import { getRequestStats, resetRequestStats } from "@/lib/db"
import { auth } from "@clerk/nextjs/server"

export const dynamic = 'force-dynamic'

export async function GET() {
  // Optional: require auth for security
  // const { userId } = await auth()
  // if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
  
  const stats = getRequestStats()
  
  return Response.json({
    timestamp: new Date().toISOString(),
    mode: process.env.TURSO_DATABASE_URL ? 'turso' : 'local',
    env: process.env.NODE_ENV,
    ...stats
  })
}

export async function POST() {
  // const { userId } = await auth()
  // if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
  
  resetRequestStats()
  
  return Response.json({
    message: "Stats reset",
    timestamp: new Date().toISOString()
  })
}
