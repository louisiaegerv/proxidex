import { auth } from "@clerk/nextjs/server"
import { getClient } from "@/lib/db"
import { NextResponse } from "next/server"
import { ALL_TROPHIES, getAchievementTrophyIds } from "@/lib/trophies"

/**
 * GET /api/user/trophies
 * Returns all trophies with unlock status for the current user
 */
export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getClient()

    // Get user's subscription tier and start date
    const subResult = await db.execute({
      sql: `SELECT tier, started_at FROM subscriptions WHERE user_id = ?`,
      args: [userId],
    })
    const userTier =
      subResult.rows.length > 0 ? String(subResult.rows[0].tier) : "free"
    const subStartedAt =
      subResult.rows.length > 0 ? String(subResult.rows[0].started_at) : null

    // Get unlocked trophies
    const trophiesResult = await db.execute({
      sql: `
        SELECT trophy_id, unlocked_at, progress, progress_target
        FROM user_trophies
        WHERE user_id = ?
      `,
      args: [userId],
    })

    const unlockedMap = new Map(
      trophiesResult.rows.map((row) => [
        String(row.trophy_id),
        {
          unlockedAt: String(row.unlocked_at),
          progress: Number(row.progress || 0),
          progressTarget: Number(row.progress_target || 1),
        },
      ])
    )

    // Build response with all trophies and their status
    const trophies = ALL_TROPHIES.map((trophy) => {
      const unlocked = unlockedMap.get(trophy.id)
      const isUnlocked = !!unlocked

      // Tier trophies are unlocked if user has the matching subscription
      // (or already recorded in DB)
      const isTierUnlocked =
        trophy.category === "tier" && trophy.tier === userTier

      // For tier trophies unlocked via subscription but no DB record,
      // use the subscription start date as the unlocked date
      const tierUnlockedAt =
        isTierUnlocked && !unlocked
          ? subStartedAt
          : unlocked?.unlockedAt || null

      return {
        ...trophy,
        isUnlocked: isUnlocked || isTierUnlocked,
        unlockedAt: tierUnlockedAt,
        progress: unlocked?.progress || 0,
        progressTarget: trophy.target || 1,
      }
    })

    // Count stats
    const total = trophies.length
    const unlocked = trophies.filter((t) => t.isUnlocked).length
    const achievementIds = getAchievementTrophyIds()
    const achievementsUnlocked = trophies.filter(
      (t) => t.isUnlocked && achievementIds.includes(t.id)
    ).length

    return NextResponse.json({
      trophies,
      stats: {
        total,
        unlocked,
        remaining: total - unlocked,
        achievementsTotal: achievementIds.length,
        achievementsUnlocked,
      },
    })
  } catch (error) {
    console.error("Failed to fetch trophies:", error)
    return NextResponse.json(
      { error: "Failed to fetch trophies" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/user/trophies
 * Unlock a trophy or update progress
 * Body: { trophyId: string, progress?: number }
 */
export async function POST(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { trophyId, progress = 1 } = body

    if (!trophyId) {
      return NextResponse.json(
        { error: "trophyId is required" },
        { status: 400 }
      )
    }

    const trophy = ALL_TROPHIES.find((t) => t.id === trophyId)
    if (!trophy) {
      return NextResponse.json({ error: "Invalid trophyId" }, { status: 400 })
    }

    const db = getClient()

    // Check if already unlocked
    const existing = await db.execute({
      sql: `SELECT * FROM user_trophies WHERE user_id = ? AND trophy_id = ?`,
      args: [userId, trophyId],
    })

    if (existing.rows.length > 0) {
      // Already unlocked - update progress if provided
      if (progress > 1) {
        await db.execute({
          sql: `
            UPDATE user_trophies
            SET progress = ?
            WHERE user_id = ? AND trophy_id = ?
          `,
          args: [progress, userId, trophyId],
        })
      }
      return NextResponse.json({ unlocked: true, alreadyHad: true })
    }

    // Check if progress meets target
    const target = trophy.target || 1
    const shouldUnlock = progress >= target

    if (shouldUnlock) {
      await db.execute({
        sql: `
          INSERT INTO user_trophies (user_id, trophy_id, progress, progress_target)
          VALUES (?, ?, ?, ?)
        `,
        args: [userId, trophyId, progress, target],
      })

      // Check for master collector unlock
      if (trophyId !== "master_collector") {
        const allAchievementIds = getAchievementTrophyIds().filter(
          (id) => id !== "master_collector"
        )
        const unlockedResult = await db.execute({
          sql: `
            SELECT COUNT(*) as count FROM user_trophies
            WHERE user_id = ? AND trophy_id IN (${allAchievementIds.map(() => "?").join(",")})
          `,
          args: [userId, ...allAchievementIds],
        })

        if (Number(unlockedResult.rows[0].count) >= allAchievementIds.length) {
          // Unlock master collector
          await db.execute({
            sql: `
              INSERT OR IGNORE INTO user_trophies (user_id, trophy_id, progress, progress_target)
              VALUES (?, 'master_collector', 1, 1)
            `,
            args: [userId],
          })
        }
      }

      return NextResponse.json({ unlocked: true, trophy })
    }

    // Progress not yet at target - just return current state
    return NextResponse.json({
      unlocked: false,
      progress,
      target,
      remaining: target - progress,
    })
  } catch (error) {
    console.error("Failed to unlock trophy:", error)
    return NextResponse.json(
      { error: "Failed to unlock trophy" },
      { status: 500 }
    )
  }
}
