"use client"

import { useCallback } from "react"

/**
 * Client-side hook for unlocking trophies
 *
 * Usage in components:
 *   const { unlockTrophy } = useTrophyUnlock()
 *
 *   // On some action:
 *   await unlockTrophy('first_deck')
 *
 *   // With progress tracking:
 *   await unlockTrophy('deck_collector', { progress: currentDeckCount })
 */

interface UnlockOptions {
  progress?: number
  silent?: boolean
}

export function useTrophyUnlock() {
  const unlockTrophy = useCallback(
    async (trophyId: string, options: UnlockOptions = {}) => {
      const { progress, silent = true } = options

      try {
        const response = await fetch("/api/user/trophies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trophyId,
            progress: progress ?? 1,
          }),
        })

        if (!response.ok) {
          console.warn("Trophy unlock failed:", await response.text())
          return { success: false }
        }

        const result = await response.json()

        // Dispatch event so TrophyCase can refresh
        if (result.unlocked) {
          window.dispatchEvent(new Event("trophy-unlocked"))

          if (!silent) {
            // Could show a toast notification here
            console.log(`Trophy unlocked: ${trophyId}`)
          }
        }

        return { success: true, ...result }
      } catch (error) {
        console.warn("Trophy unlock error:", error)
        return { success: false }
      }
    },
    []
  )

  return { unlockTrophy }
}

/**
 * Batch unlock multiple trophies at once
 * Useful for tier-based unlocks on page load
 */
export function useTrophyBatchUnlock() {
  const unlockBatch = useCallback(async (trophyIds: string[]) => {
    const results = await Promise.all(
      trophyIds.map((id) =>
        fetch("/api/user/trophies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trophyId: id, progress: 1 }),
        }).catch(() => null)
      )
    )

    const anyUnlocked = results.some(
      (r) =>
        r?.ok &&
        (r.json() as Promise<{ unlocked: boolean }>).then((d) => d.unlocked)
    )

    if (anyUnlocked) {
      window.dispatchEvent(new Event("trophy-unlocked"))
    }

    return results
  }, [])

  return { unlockBatch }
}
