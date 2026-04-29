import { auth } from "@clerk/nextjs/server"
import { recordExport } from "@/lib/exports"
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
    const exportType = await recordExport(userId)

    return NextResponse.json({
      success: true,
      exportType,
    })
  } catch (error) {
    console.error("Error recording export:", error)
    return NextResponse.json(
      { error: "Failed to record export" },
      { status: 500 }
    )
  }
}
