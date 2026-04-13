/**
 * Admin endpoint for database cleanup
 * 
 * Can be triggered by:
 * - Vercel Cron (recommended)
 * - Manual admin request
 * - Build process
 * 
 * Protected by secret key to prevent unauthorized access
 */

import { NextRequest } from "next/server"
import { cleanupOldExports, EXPORT_RETENTION_DAYS } from "@/lib/exports"

export async function POST(request: NextRequest) {
  // Verify admin secret
  const authHeader = request.headers.get("authorization")
  const expectedSecret = process.env.ADMIN_SECRET_KEY
  
  if (!expectedSecret) {
    return Response.json(
      { error: "ADMIN_SECRET_KEY not configured" },
      { status: 500 }
    )
  }
  
  if (authHeader !== `Bearer ${expectedSecret}`) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }
  
  try {
    // Cleanup exports older than retention period (default 365 days)
    const deletedExports = await cleanupOldExports(EXPORT_RETENTION_DAYS)
    
    // TODO: Add other cleanup operations here
    // - Old deck versions
    // - Expired sessions
    // - Orphaned data
    
    return Response.json({
      success: true,
      deleted: {
        exports: deletedExports
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("Cleanup failed:", error)
    return Response.json(
      { error: "Cleanup failed", message: String(error) },
      { status: 500 }
    )
  }
}

// Also allow GET for Vercel Cron (with query param for auth)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get("secret")
  
  if (secret !== process.env.ADMIN_SECRET_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  // Delegate to POST handler
  return POST(request)
}
