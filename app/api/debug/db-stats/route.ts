import { NextResponse } from "next/server"
import { getRequestStats, resetRequestStats } from "@/lib/db"

export async function GET() {
  const stats = getRequestStats()
  return NextResponse.json({
    tursoRequests: stats.turso,
    localRequests: stats.local,
    totalRequests: stats.turso + stats.local,
    note: "These are ACTUAL database execute() calls, not isTursoMode() checks"
  })
}

export async function POST() {
  resetRequestStats()
  return NextResponse.json({ message: "Stats reset" })
}
