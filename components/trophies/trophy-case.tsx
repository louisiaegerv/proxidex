"use client"

import { useState, useEffect, createContext, useContext } from "react"
import { ArrowLeft, Trophy, Lock, ListFilter } from "lucide-react"
import Link from "next/link"
import { TrophyCard } from "./trophy-card"
import { TrophyDetailModal } from "./trophy-detail-modal"
import type { TrophyDefinition, TrophyTrack } from "@/lib/trophies"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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

type FilterTab = "all" | "tier" | "one-off" | TrophyTrack

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "tier", label: "Tiers" },
  { key: "one-off", label: "One-Offs" },
  { key: "deck_builder", label: "Decks" },
  { key: "searcher", label: "Search" },
  { key: "exporter", label: "Exports" },
  { key: "importer", label: "Imports" },
  { key: "logins", label: "Logins" },
]

export function TrophyCase({ className }: TrophyCaseProps) {
  const { data, isLoading, refetch } = useTrophies()
  const [filter, setFilter] = useState<FilterTab>("all")
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
      <div className={cn("px-4 py-6 sm:px-6", className)}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-yellow-400">
            <Trophy className="h-4 w-4 text-black" />
          </div>
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
      <div className={cn("px-4 py-6 sm:px-6", className)}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-yellow-400">
            <Trophy className="h-4 w-4 text-black" />
          </div>
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
    if (filter === "tier") return t.category === "tier"
    if (filter === "one-off") return t.category === "achievement" && !t.track
    return t.track === filter
  })

  const getUnlockedCount = (key: FilterTab) => {
    if (key === "all") return data.stats.unlocked
    if (key === "tier")
      return data.trophies.filter((t) => t.category === "tier" && t.isUnlocked).length
    if (key === "one-off")
      return data.trophies.filter(
        (t) => t.category === "achievement" && !t.track && t.isUnlocked
      ).length
    return data.trophies.filter((t) => t.track === key && t.isUnlocked).length
  }

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

  const percent = Math.round((data.stats.unlocked / data.stats.total) * 100)

  return (
    <div className={cn("", className)}>
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* Sticky header — transparent */}
      <div className="sticky top-0 z-30">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/account"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700/50 bg-slate-900/60 text-slate-400 transition-colors hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-yellow-400">
              <Trophy className="h-4 w-4 text-black" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight text-slate-100">
                Trophy Case
              </h1>
              <p className="text-xs text-slate-400 truncate">
                {data.stats.unlocked} / {data.stats.total} collected
              </p>
            </div>
          </div>

          {/* Category Select */}
          <div className="ml-auto shrink-0">
            <Select
              value={filter}
              onValueChange={(value) => setFilter(value as FilterTab)}
            >
              <SelectTrigger className="h-8 w-auto min-w-[7.5rem] gap-2 rounded-full border-slate-700/60 bg-slate-900/60 px-3 py-1.5 text-xs font-medium hover:bg-slate-800/60">
                <ListFilter className="h-3.5 w-3.5 text-slate-400" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent className="min-w-[10rem]" sideOffset={4}>
                {FILTER_TABS.map((tab) => (
                  <SelectItem key={tab.key} value={tab.key} className="text-xs">
                    <div className="flex items-center justify-between gap-4">
                      <span>{tab.label}</span>
                      <span className="ml-2 text-[10px] tabular-nums text-slate-500">
                        {getUnlockedCount(tab.key)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6 px-4 pb-12 pt-2 sm:px-6">
        {/* Collection Progress Card */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="text-slate-400">Collection Progress</span>
            <span className="font-medium text-slate-200">
              {data.stats.unlocked} / {data.stats.total} collected
            </span>
          </div>

          {/* Glowing progress bar */}
          <div className="relative py-2">
            {/* Ambient golden glow — hugged to the filled bar */}
            <div
              className="pointer-events-none absolute left-0 top-1/2 h-8 -translate-y-1/2 opacity-60 blur-lg"
              style={{
                width: `${Math.max(percent, 4)}%`,
                background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.2) 0%, rgba(251, 191, 36, 0.55) 100%)',
              }}
            />
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-800/80">
              <div
                className="relative h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 transition-all duration-500"
                style={{
                  width: `${percent}%`,
                }}
              >
                {/* Right-end glow */}
                <div
                  className="absolute right-0 top-1/2 h-full w-10 -translate-y-1/2 rounded-full"
                  style={{
                    background: 'radial-gradient(circle at right, rgba(251, 191, 36, 0.95) 0%, transparent 65%)',
                    animation: 'pulse-glow 2s ease-in-out infinite',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-slate-800/80 px-3 py-1 text-[11px]">
              <span className="text-slate-400">Tiers</span>
              <span className="font-semibold text-slate-200">
                {tierUnlocked} / {tierTotal}
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-slate-800/80 px-3 py-1 text-[11px]">
              <span className="text-slate-400">Achievements</span>
              <span className="font-semibold text-slate-200">
                {achievementUnlocked} / {achievementTotal}
              </span>
            </div>
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
      </div>

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
