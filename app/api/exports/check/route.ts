import { auth } from "@clerk/nextjs/server"
import { canUserExport, canUseTurboExport, getRemainingExports } from "@/lib/exports"
import { isProUser } from "@/lib/subscription"
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
    const isPro = await isProUser(userId)

    const canExport = await canUserExport(userId, isPro)
    const canTurbo = await canUseTurboExport(userId, isPro)
    const remaining = await getRemainingExports(userId, isPro)

    return NextResponse.json({
      canExport,
      canUseTurbo: canTurbo,
      remaining,
      isPro,
    })
  } catch (error) {
    console.error("Error checking exports:", error)
    return NextResponse.json(
      { error: "Failed to check exports" },
      { status: 500 }
    )
  }
}
