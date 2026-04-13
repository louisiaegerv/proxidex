"use client"

import { useState, useEffect } from "react"

interface TursoStats {
  turso: number
  local: number
  details?: {
    total: number
    byType: Record<string, number>
    recentQueries: Array<{
      type: string
      sql: string
      time: string
    }>
  }
}

// Only enable in development mode
const isDev = process.env.NODE_ENV === "development"

export function TursoMonitor() {
  const [stats, setStats] = useState<TursoStats | null>(null)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Don't run in production
    if (!isDev) return

    const fetchStats = async () => {
      try {
        const res = await fetch("/api/debug/turso-stats")
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch (err) {
        console.error("Failed to fetch Turso stats:", err)
      }
    }

    // Poll every 10 seconds (much slower to reduce server load)
    fetchStats()
    const interval = setInterval(fetchStats, 10000)

    return () => clearInterval(interval)
  }, [])

  const resetStats = async () => {
    try {
      await fetch("/api/debug/turso-stats", { method: "POST" })
      setStats(null)
    } catch (err) {
      console.error("Failed to reset stats:", err)
    }
  }

  // Don't render anything in production
  if (!isDev) return null

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 z-50 rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400 hover:bg-slate-700"
      >
        Show Turso Stats
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 w-80 max-h-96 overflow-auto rounded-lg border border-slate-700 bg-slate-900/95 p-4 text-xs shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-bold text-slate-200">Turso Monitor</h3>
        <div className="flex gap-2">
          <button
            onClick={resetStats}
            className="rounded bg-slate-700 px-2 py-1 text-slate-300 hover:bg-slate-600"
          >
            Reset
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="rounded bg-slate-700 px-2 py-1 text-slate-300 hover:bg-slate-600"
          >
            Hide
          </button>
        </div>
      </div>

      {stats ? (
        <div className="space-y-3">
          <div className="rounded bg-slate-800 p-2">
            <div className="text-slate-400">Total Queries: <span className="text-slate-200 font-mono">{stats.turso}</span></div>
          </div>

          {stats.details && stats.details.byType && (
            <div className="rounded bg-slate-800 p-2">
              <div className="mb-1 text-slate-500">By Type:</div>
              <div className="space-y-1">
                {Object.entries(stats.details.byType)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <div key={type} className="flex justify-between">
                      <span className="text-slate-400">{type}:</span>
                      <span className="font-mono text-slate-200">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {stats.details?.recentQueries && stats.details.recentQueries.length > 0 && (
            <div className="rounded bg-slate-800 p-2">
              <div className="mb-1 text-slate-500">Recent Queries:</div>
              <div className="space-y-1 max-h-32 overflow-auto">
                {stats.details.recentQueries.slice(0, 10).map((q, i) => (
                  <div key={i} className="text-slate-400 truncate" title={q.sql}>
                    [{q.type}] {q.sql.slice(0, 40)}...
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-slate-500">Loading...</div>
      )}
    </div>
  )
}
