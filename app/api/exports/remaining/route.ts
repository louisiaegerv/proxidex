import { auth } from "@clerk/nextjs/server"
import { getUserExportLimits, getRemainingExports, FREE_TIER_DAILY_LIMIT, WELCOME_EXPORT_CREDITS, TURBO_EXPORT_LIMIT } from "@/lib/exports"
import { isProUser } from "@/lib/subscription"
import { NextResponse } from "next/server"

export async function GET() {
  const { userId } = await auth()
  
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }
  
  try {
    // Check if user has Pro subscription (any Pro tier)
    const isPro = await isProUser(userId)
    
    // Get detailed export limits
    const limits = await getUserExportLimits(userId, isPro)
    
    // Also get simplified remaining count for backward compatibility
    const remaining = await getRemainingExports(userId, isPro)
    
    return NextResponse.json({
      // Detailed breakdown (new)
      dailyUsed: limits.dailyUsed,
      dailyLimit: limits.dailyLimit,
      dailyRemaining: Math.max(0, limits.dailyLimit - limits.dailyUsed),
      welcomeUsed: limits.welcomeUsed,
      welcomeLimit: limits.welcomeLimit,
      welcomeRemaining: Math.max(0, limits.welcomeLimit - limits.welcomeUsed),
      turboUsed: limits.turboUsed,
      turboLimit: limits.turboLimit,
      turboRemaining: Math.max(0, limits.turboLimit - limits.turboUsed),
      isPro: limits.isPro,
      // Simplified total for backward compatibility
      remaining: remaining.total,
      total: remaining.total
    })
  } catch (error) {
    console.error("Error getting remaining exports:", error)
    return NextResponse.json(
      { error: "Failed to get remaining exports" },
      { status: 500 }
    )
  }
}
