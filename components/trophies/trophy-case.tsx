"use client"

import { useState, useEffect, createContext, useContext } from "react"
import { Trophy, Lock } from "lucide-react"
import { TrophyCard } from "./trophy-card"
import { TrophyDetailModal } from "./trophy-detail-modal"
import type { TrophyDefinition } from "@/lib/trophies"
import { cn } from "@/lib/utils"

interface TrophyWithStatus extends TrophyDefinition {
  isUnlocked: boolean
  unlockedAt: string | null
  progress: number
  progressTarget: number
}

interface TrophyStats {
  total: number
  unlocked: number
  remaining: number
  achievementsTotal: number
  achievementsUnlocked: number
}

interface TrophyData {
  trophies: TrophyWithStatus[]
  stats: TrophyStats
}

interface TrophyContextType {
  data: TrophyData | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

const TrophyContext = createContext<TrophyContextType | undefined>(undefined)

export function TrophyProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<TrophyData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchTrophies = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/user/trophies")
      if (!response.ok) throw new Error("Failed to fetch trophies")

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTrophies()
  }, [])

  // Listen for trophy-unlocked events from other components
  useEffect(() => {
    const handleTrophyUnlocked = () => {
      fetchTrophies()
    }
    window.addEventListener("trophy-unlocked", handleTrophyUnlocked)
    return () =>
      window.removeEventListener("trophy-unlocked", handleTrophyUnlocked)
  }, [])

  return (
    <TrophyContext.Provider
      value={{ data, isLoading, error, refetch: fetchTrophies }}
    >
      {children}
    </TrophyContext.Provider>
  )
}

export function useTrophies() {
  const context = useContext(TrophyContext)
  if (context === undefined) {
    throw new Error("useTrophies must be used within a TrophyProvider")
  }
  return context
}

// ============================================================================
// Trophy Summary (compact card for account page)
// ============================================================================

interface TrophySummaryProps {
  className?: string
}

export function TrophySummary({ className }: TrophySummaryProps) {
  const { data, isLoading } = useTrophies()

  if (isLoading) {
    return (
      <div
        className={cn(
          "rounded-xl border border-slate-700/50 bg-slate-900/60 p-4",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-800" />
          <div className="space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-800" />
            <div className="h-3 w-20 animate-pulse rounded bg-slate-800" />
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div
        className={cn(
          "rounded-xl border border-slate-700/50 bg-slate-900/60 p-4",
          className
        )}
      >
        <p className="text-sm text-slate-500">Unable to load trophies.</p>
      </div>
    )
  }

  const percent = Math.round((data.stats.unlocked / data.stats.total) * 100)
  const nextUnlock = data.trophies.find(
    (t) => !t.isUnlocked && t.category === "achievement"
  )

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl",
        className
      )}
    >
      <div className="flex items-center gap-4">
        {/* Trophy icon */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-400/10 ring-1 ring-amber-500/20">
          <Trophy className="h-6 w-6 text-amber-500" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100">Trophy Case</h3>
            <span className="text-xs font-medium text-amber-400">
              {data.stats.unlocked}/{data.stats.total}
            </span>
          </div>

          {/* Mini progress bar */}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>

          <p className="mt-1.5 text-[11px] text-slate-500">
            {percent === 100
              ? "All trophies collected!"
              : nextUnlock
                ? `Next: ${nextUnlock.name}`
                : `${data.stats.remaining} remaining`}
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Full Trophy Case (for dedicated /trophies page)
// ============================================================================

interface TrophyCaseProps {
  className?: string
}

export function TrophyCase({ className }: TrophyCaseProps) {
  const { data, isLoading, refetch } = useTrophies()
  const [filter, setFilter] = useState<"all" | "tier" | "achievement">("all")
  const [selectedTrophy, setSelectedTrophy] = useState<TrophyWithStatus | null>(
    null
  )

  // Auto-unlock "first_visit" trophy when viewing the trophy case
  useEffect(() => {
    if (!data) return

    const firstVisitTrophy = data.trophies.find((t) => t.id === "first_visit")
    if (firstVisitTrophy && !firstVisitTrophy.isUnlocked) {
      fetch("/api/user/trophies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trophyId: "first_visit", progress: 1 }),
      })
        .then((res) => res.json())
        .then((result) => {
          if (result.unlocked) {
            refetch()
          }
        })
        .catch(() => {
          // Silently fail
        })
    }
  }, [data, refetch])

  if (isLoading) {
    return (
      <div
        className={cn(
          "rounded-xl border border-slate-700/50 bg-slate-900/60 p-6",
          className
        )}
      >
        <div className="mb-4 flex items-center gap-3">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-100">Trophy Case</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="aspect-[63/88] animate-pulse rounded-xl bg-slate-800/50"
            />
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div
        className={cn(
          "rounded-xl border border-slate-700/50 bg-slate-900/60 p-6",
          className
        )}
      >
        <div className="mb-4 flex items-center gap-3">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-100">Trophy Case</h2>
        </div>
        <p className="text-sm text-slate-400">
          Unable to load trophies. Try refreshing the page.
        </p>
      </div>
    )
  }

  const filteredTrophies = data.trophies.filter((t) => {
    if (filter === "all") return true
    return t.category === filter
  })

  const tierUnlocked = data.trophies.filter(
    (t) => t.category === "tier" && t.isUnlocked
  ).length
  const tierTotal = data.trophies.filter((t) => t.category === "tier").length
  const achievementUnlocked = data.trophies.filter(
    (t) => t.category === "achievement" && t.isUnlocked
  ).length
  const achievementTotal = data.trophies.filter(
    (t) => t.category === "achievement"
  ).length

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-400">
            <Trophy className="h-6 w-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Trophy Case</h1>
            <p className="text-sm text-slate-400">
              {data.stats.unlocked} / {data.stats.total} collected
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 rounded-lg bg-slate-800/50 p-1">
          {[
            { key: "all" as const, label: "All", count: data.stats.unlocked },
            { key: "tier" as const, label: "Tiers", count: tierUnlocked },
            {
              key: "achievement" as const,
              label: "Achievements",
              count: achievementUnlocked,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                filter === tab.key
                  ? "bg-slate-700 text-slate-100"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]",
                  filter === tab.key
                    ? "bg-slate-600 text-slate-300"
                    : "bg-slate-700/50 text-slate-500"
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Overall progress */}
      <div>
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-slate-400">Collection Progress</span>
          <span className="font-medium text-slate-200">
            {Math.round((data.stats.unlocked / data.stats.total) * 100)}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
            style={{
              width: `${(data.stats.unlocked / data.stats.total) * 100}%`,
            }}
          />
        </div>
        <div className="mt-2 flex gap-4 text-[10px] text-slate-500">
          <span>
            Tiers: {tierUnlocked}/{tierTotal}
          </span>
          <span>
            Achievements: {achievementUnlocked}/{achievementTotal}
          </span>
          <span className="ml-auto">{data.stats.remaining} remaining</span>
        </div>
      </div>

      {/* Trophy grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {filteredTrophies.map((trophy) => (
          <TrophyCard
            key={trophy.id}
            trophy={trophy}
            isUnlocked={trophy.isUnlocked}
            unlockedAt={trophy.unlockedAt}
            progress={trophy.progress}
            progressTarget={trophy.progressTarget}
            onClick={() => setSelectedTrophy(trophy)}
          />
        ))}
      </div>

      {/* Empty state for filter */}
      {filteredTrophies.length === 0 && (
        <div className="py-12 text-center">
          <Lock className="mx-auto mb-2 h-8 w-8 text-slate-600" />
          <p className="text-sm text-slate-500">
            No trophies in this category yet.
          </p>
        </div>
      )}

      <TrophyDetailModal
        trophy={selectedTrophy}
        isUnlocked={selectedTrophy?.isUnlocked ?? false}
        unlockedAt={selectedTrophy?.unlockedAt ?? null}
        progress={selectedTrophy?.progress ?? 0}
        progressTarget={selectedTrophy?.progressTarget ?? 1}
        open={selectedTrophy !== null}
        onOpenChange={(open) => !open && setSelectedTrophy(null)}
      />
    </div>
  )
}
