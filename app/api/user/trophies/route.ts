import { auth } from "@clerk/nextjs/server"
import { getClient } from "@/lib/db"
import { NextResponse } from "next/server"
import {
  ALL_TROPHIES,
  getAchievementTrophyIds,
  getTrophiesByTrack,
  ACTION_TO_TRACK,
  getTrophyById,
  TIER_CASCADE_MAP,
} from "@/lib/trophies"

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
          unlockedAt: row.unlocked_at ? String(row.unlocked_at) : null,
          progress: Number(row.progress || 0),
          progressTarget: Number(row.progress_target || 1),
        },
      ])
    )

    // Build response with all trophies and their status
    const trophies = ALL_TROPHIES.map((trophy) => {
      const unlocked = unlockedMap.get(trophy.id)
      const target = trophy.target || 1

      // Tier trophies cascade: higher tiers unlock lower tier trophies
      const cascadedTiers = TIER_CASCADE_MAP[userTier] || []
      const isTierUnlocked =
        trophy.category === "tier" && cascadedTiers.includes(trophy.tier!)

      // Achievement trophies are unlocked if progress >= target
      const isAchievementUnlocked =
        trophy.category === "achievement" &&
        !!unlocked &&
        unlocked.progress >= target

      const isUnlocked = isTierUnlocked || isAchievementUnlocked

      // For tier trophies unlocked via subscription but no DB record,
      // use the subscription start date as the unlocked date
      const tierUnlockedAt =
        isTierUnlocked && !unlocked ? subStartedAt : unlocked?.unlockedAt || null

      return {
        ...trophy,
        isUnlocked,
        unlockedAt: tierUnlockedAt,
        progress: unlocked?.progress || 0,
        progressTarget: target,
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
 * Upsert trophy progress into the database.
 * Returns { newlyUnlocked: boolean }
 */
async function upsertTrophyProgress(
  db: ReturnType<typeof getClient>,
  userId: string,
  trophyId: string,
  progress: number,
  target: number
) {
  const existing = await db.execute({
    sql: `SELECT progress, progress_target FROM user_trophies WHERE user_id = ? AND trophy_id = ?`,
    args: [userId, trophyId],
  })

  const isNowUnlocked = progress >= target

  if (existing.rows.length > 0) {
    const wasUnlocked =
      Number(existing.rows[0].progress || 0) >=
      Number(existing.rows[0].progress_target || 1)

    if (isNowUnlocked && !wasUnlocked) {
      // Newly unlocked — set unlocked_at
      await db.execute({
        sql: `
          UPDATE user_trophies
          SET progress = ?, progress_target = ?, unlocked_at = CURRENT_TIMESTAMP
          WHERE user_id = ? AND trophy_id = ?
        `,
        args: [progress, target, userId, trophyId],
      })
      return { newlyUnlocked: true }
    } else {
      // Just update progress
      await db.execute({
        sql: `
          UPDATE user_trophies
          SET progress = ?, progress_target = ?
          WHERE user_id = ? AND trophy_id = ?
        `,
        args: [progress, target, userId, trophyId],
      })
      return { newlyUnlocked: false }
    }
  } else {
    // Insert new row
    if (isNowUnlocked) {
      await db.execute({
        sql: `
          INSERT INTO user_trophies (user_id, trophy_id, progress, progress_target, unlocked_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `,
        args: [userId, trophyId, progress, target],
      })
    } else {
      await db.execute({
        sql: `
          INSERT INTO user_trophies (user_id, trophy_id, progress, progress_target, unlocked_at)
          VALUES (?, ?, ?, ?, NULL)
        `,
        args: [userId, trophyId, progress, target],
      })
    }
    return { newlyUnlocked: isNowUnlocked }
  }
}

/**
 * Track a login event with daily deduplication, streak calculation,
 * and rich analytics. Returns the updated login state.
 */
async function recordLogin(
  db: ReturnType<typeof getClient>,
  userId: string
): Promise<{
  count: number
  alreadyLoggedToday: boolean
  currentStreak: number
  longestStreak: number
}> {
  const today = new Date().toISOString().split("T")[0]

  const result = await db.execute({
    sql: `
      SELECT login_count, current_streak, longest_streak,
             last_login_date, first_login_at
      FROM user_logins
      WHERE user_id = ?
    `,
    args: [userId],
  })

  // First login ever
  if (result.rows.length === 0) {
    await db.execute({
      sql: `
        INSERT INTO user_logins
          (user_id, login_count, current_streak, longest_streak,
           first_login_at, last_login_at, last_login_date)
        VALUES (?, 1, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
      `,
      args: [userId, today],
    })
    await db.execute({
      sql: `INSERT OR IGNORE INTO user_login_events (user_id, login_date) VALUES (?, ?)`,
      args: [userId, today],
    })
    return { count: 1, alreadyLoggedToday: false, currentStreak: 1, longestStreak: 1 }
  }

  const row = result.rows[0]
  const count = Number(row.login_count || 0)
  const currentStreak = Number(row.current_streak || 0)
  const longestStreak = Number(row.longest_streak || 0)
  const lastDate = String(row.last_login_date || "")

  if (lastDate === today) {
    return { count, alreadyLoggedToday: true, currentStreak, longestStreak }
  }

  // Calculate streak based on days since last login
  const last = new Date(lastDate + "T00:00:00")
  const now = new Date(today + "T00:00:00")
  const msPerDay = 86_400_000
  const daysSince = Math.round((now.getTime() - last.getTime()) / msPerDay)

  const newStreak = daysSince === 1 ? currentStreak + 1 : 1
  const newLongest = Math.max(longestStreak, newStreak)
  const newCount = count + 1

  await db.execute({
    sql: `
      UPDATE user_logins
      SET login_count = ?,
          current_streak = ?,
          longest_streak = ?,
          last_login_at = CURRENT_TIMESTAMP,
          last_login_date = ?
      WHERE user_id = ?
    `,
    args: [newCount, newStreak, newLongest, today, userId],
  })

  // Record immutable event for historical analytics
  await db.execute({
    sql: `INSERT OR IGNORE INTO user_login_events (user_id, login_date) VALUES (?, ?)`,
    args: [userId, today],
  })

  return {
    count: newCount,
    alreadyLoggedToday: false,
    currentStreak: newStreak,
    longestStreak: newLongest,
  }
}

/**
 * Check if user has unlocked all achievements (excluding master_collector).
 * If so, award master_collector.
 */
async function checkMasterCollector(
  db: ReturnType<typeof getClient>,
  userId: string
) {
  const allAchievementIds = getAchievementTrophyIds().filter(
    (id) => id !== "master_collector"
  )

  const unlockedResult = await db.execute({
    sql: `
      SELECT COUNT(*) as count FROM user_trophies
      WHERE user_id = ? AND trophy_id IN (${allAchievementIds.map(() => "?").join(",")})
      AND progress >= progress_target
    `,
    args: [userId, ...allAchievementIds],
  })

  if (Number(unlockedResult.rows[0].count) >= allAchievementIds.length) {
    await db.execute({
      sql: `
        INSERT OR IGNORE INTO user_trophies (user_id, trophy_id, progress, progress_target, unlocked_at)
        VALUES (?, 'master_collector', 1, 1, CURRENT_TIMESTAMP)
      `,
      args: [userId],
    })
    return true
  }
  return false
}

/**
 * POST /api/user/trophies
 * Unlock a trophy or update progress.
 *
 * Supports two modes:
 * 1. Action-based (for tiered tracks): { action: string, progress: number }
 * 2. Trophy-based (for one-offs): { trophyId: string, progress?: number }
 */
export async function POST(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { trophyId, action, progress = 1, increment = false } = body

    const db = getClient()

    // ─── Mode 1: Action-based tiered track progress ───
    if (action) {
      const track = ACTION_TO_TRACK[action]
      if (!track) {
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        )
      }

      let effectiveProgress = progress

      // ─── Login count: server-side deduplication + streak analytics ───
      if (action === "login_count") {
        const {
          count,
          alreadyLoggedToday,
          currentStreak,
          longestStreak,
        } = await recordLogin(db, userId)
        if (alreadyLoggedToday) {
          return NextResponse.json({
            unlocked: false,
            alreadyLoggedToday: true,
            progress: count,
            currentStreak,
            longestStreak,
            track,
          })
        }
        effectiveProgress = count
      } else if (increment) {
        // Generic increment for other tracks
        const trackIds = getTrophiesByTrack(track).map((t) => t.id)
        const currentResult = await db.execute({
          sql: `
            SELECT MAX(progress) as max_progress FROM user_trophies
            WHERE user_id = ? AND trophy_id IN (${trackIds.map(() => "?").join(",")})
          `,
          args: [userId, ...trackIds],
        })
        const currentProgress = Number(currentResult.rows[0]?.max_progress || 0)
        effectiveProgress = currentProgress + progress
      }

      const trackTrophies = getTrophiesByTrack(track).sort(
        (a, b) => (a.target || 1) - (b.target || 1)
      )

      const unlockedTrophies = []
      for (const trophy of trackTrophies) {
        const target = trophy.target || 1
        const result = await upsertTrophyProgress(
          db,
          userId,
          trophy.id,
          effectiveProgress,
          target
        )
        if (result.newlyUnlocked) {
          unlockedTrophies.push(trophy)
        }
      }

      const masterUnlocked = await checkMasterCollector(db, userId)

      return NextResponse.json({
        unlocked: unlockedTrophies.length > 0,
        trophies: unlockedTrophies,
        masterUnlocked,
        progress: effectiveProgress,
        track,
      })
    }

    // ─── Mode 2: Individual trophy unlock ───
    if (!trophyId) {
      return NextResponse.json(
        { error: "trophyId or action is required" },
        { status: 400 }
      )
    }

    const trophy = getTrophyById(trophyId)
    if (!trophy) {
      return NextResponse.json({ error: "Invalid trophyId" }, { status: 400 })
    }

    const target = trophy.target || 1
    const result = await upsertTrophyProgress(
      db,
      userId,
      trophyId,
      progress,
      target
    )

    // If this trophy is part of a tiered track, also auto-unlock lower tiers
    if (trophy.track) {
      const trackTrophies = getTrophiesByTrack(trophy.track).sort(
        (a, b) => (a.target || 1) - (b.target || 1)
      )

      for (const tierTrophy of trackTrophies) {
        if (tierTrophy.id === trophyId) continue
        const tierTarget = tierTrophy.target || 1
        if (progress >= tierTarget) {
          const tierResult = await upsertTrophyProgress(
            db,
            userId,
            tierTrophy.id,
            progress,
            tierTarget
          )
          if (tierResult.newlyUnlocked) {
            result.newlyUnlocked = true
          }
        }
      }
    }

    // Check for master collector unlock
    const masterUnlocked = await checkMasterCollector(db, userId)

    if (result.newlyUnlocked || masterUnlocked) {
      return NextResponse.json({
        unlocked: true,
        trophy,
        masterUnlocked,
      })
    }

    // Progress not yet at target — return current state
    return NextResponse.json({
      unlocked: false,
      progress,
      target,
      remaining: Math.max(0, target - progress),
    })
  } catch (error) {
    console.error("Failed to unlock trophy:", error)
    return NextResponse.json(
      { error: "Failed to unlock trophy" },
      { status: 500 }
    )
  }
}
